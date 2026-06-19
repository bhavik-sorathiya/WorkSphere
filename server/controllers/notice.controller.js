import prisma from "../lib/prisma.js";

export const createNotice = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { title, content, isForAll, viewerIds = [] } = req.body;
    const userId = req.auth?.userId;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }


    const notice = await prisma.$transaction(async (tx) => {
      const newNotice = await tx.notice.create({
        data: {
          organizationId: orgId,
          title,
          content,
          createdBy: userId,
          isForAll,
        },
      });

      if (!isForAll && viewerIds.length > 0) {
        // Automatically add creator as viewer
        if (!viewerIds.includes(userId)) {
          viewerIds.push(userId);
        }

        const validUsers = await tx.userOrganizationRole.findMany({
          where: { organizationId: orgId, userId: { in: viewerIds } },
          select: { userId: true },
        });

        if (validUsers.length > 0) {
          await tx.noticeViewer.createMany({
            data: validUsers.map((u) => ({
              noticeId: newNotice.id,
              userId: u.userId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return newNotice;
    });

    res.status(201).json(notice);
  } catch (error) {
    next(error);
  }
};

export const getNotices = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const userId = req.auth?.userId;

    const userRole = req.userRole; // from requireRole middleware
    const isAdminOrOwner = userRole === "ADMIN" || userRole === "OWNER" || userRole === "MANAGER";

    const whereClause = {
      organizationId: orgId,
      ...(isAdminOrOwner ? {} : {
        OR: [
          { isForAll: true },
          { viewers: { some: { userId } } }
        ]
      })
    };

    const notices = await prisma.notice.findMany({
      where: whereClause,
      include: {
        viewers: { include: { user: true } }
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(notices);
  } catch (error) {
    next(error);
  }
};

export const deleteNotice = async (req, res, next) => {
  try {
    const { orgId, noticeId } = req.params;
    const userId = req.auth?.userId;


    await prisma.notice.delete({
      where: { id: noticeId },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
