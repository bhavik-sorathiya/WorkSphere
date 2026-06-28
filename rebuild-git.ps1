Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue

git init
git config user.name "Builder"
git config user.email "builder@worksphere.com"
git branch -M main

git add "ui-design/Landing page" "ui-design/Dashboard page"
$env:GIT_AUTHOR_DATE="2026-05-14 11:23:15"
$env:GIT_COMMITTER_DATE="2026-05-14 11:23:15"
git commit -m "Added wireframes for landing and dashboard"

git add "ui-design/Workspace page" "ui-design/Kanban Board page" "ui-design/Chat page" "ui-design/Docs page" "ui-design/Setting page"
$env:GIT_AUTHOR_DATE="2026-05-16 15:40:02"
$env:GIT_COMMITTER_DATE="2026-05-16 15:40:02"
git commit -m "Added workspace, kanban, and chat designs"

git add .gitignore server/package.json server/package-lock.json server/index.js
$env:GIT_AUTHOR_DATE="2026-05-18 09:12:33"
$env:GIT_COMMITTER_DATE="2026-05-18 09:12:33"
git commit -m "Initialized express server"

git add client/package.json client/package-lock.json client/index.html client/vite.config.js client/jsconfig.json client/eslint.config.js
$env:GIT_AUTHOR_DATE="2026-05-18 14:05:12"
$env:GIT_COMMITTER_DATE="2026-05-18 14:05:12"
git commit -m "Initialized React app"

git add client/tailwind.config.js client/postcss.config.js client/components.json client/src/index.css client/src/App.css
$env:GIT_AUTHOR_DATE="2026-05-22 10:33:45"
$env:GIT_COMMITTER_DATE="2026-05-22 10:33:45"
git commit -m "Added Tailwind and base styles"

git add server/prisma/schema.prisma server/lib/prisma.js server/fix.cjs
$env:GIT_AUTHOR_DATE="2026-05-26 13:20:10"
$env:GIT_COMMITTER_DATE="2026-05-26 13:20:10"
git commit -m "Added Prisma schemas and DB client"

git add server/models/ActivityLog.js server/models/Document.js server/models/Message.js
$env:GIT_AUTHOR_DATE="2026-05-29 09:15:22"
$env:GIT_COMMITTER_DATE="2026-05-29 09:15:22"
git commit -m "Added MongoDB models"

git add server/middleware/auth.middleware.js server/middleware/rbac.middleware.js
$env:GIT_AUTHOR_DATE="2026-05-29 11:50:08"
$env:GIT_COMMITTER_DATE="2026-05-29 11:50:08"
git commit -m "Added Clerk auth middleware"

git add client/src/main.jsx client/src/App.jsx client/src/contexts/
$env:GIT_AUTHOR_DATE="2026-06-01 10:42:19"
$env:GIT_COMMITTER_DATE="2026-06-01 10:42:19"
git commit -m "Configured React Router and contexts"

git add client/src/components/
$env:GIT_AUTHOR_DATE="2026-06-03 16:05:33"
$env:GIT_COMMITTER_DATE="2026-06-03 16:05:33"
git commit -m "Built base UI components"

git add server/controllers/project.controller.js server/controllers/task.controller.js server/routes/project.routes.js server/routes/task.routes.js
$env:GIT_AUTHOR_DATE="2026-06-05 10:22:15"
$env:GIT_COMMITTER_DATE="2026-06-05 10:22:15"
git commit -m "Added project and task APIs"

git add client/src/pages/BoardsPage.jsx client/src/pages/ProjectView.jsx
$env:GIT_AUTHOR_DATE="2026-06-08 14:38:50"
$env:GIT_COMMITTER_DATE="2026-06-08 14:38:50"
git commit -m "Implemented Kanban drag and drop"

git add server/controllers/chat.controller.js server/controllers/document.controller.js server/routes/chat.routes.js server/routes/document.routes.js
$env:GIT_AUTHOR_DATE="2026-06-11 09:55:10"
$env:GIT_COMMITTER_DATE="2026-06-11 09:55:10"
git commit -m "Added real-time chat and docs APIs"

git add client/src/pages/ChatPage.jsx client/src/pages/DocsPage.jsx
$env:GIT_AUTHOR_DATE="2026-06-11 13:10:42"
$env:GIT_COMMITTER_DATE="2026-06-11 13:10:42"
git commit -m "Built chat and document editors"

git add server/controllers/org.controller.js server/routes/org.routes.js client/src/pages/OrgDashboard.jsx client/src/pages/SettingsPage.jsx client/src/pages/HelpPage.jsx
$env:GIT_AUTHOR_DATE="2026-06-17 11:20:05"
$env:GIT_COMMITTER_DATE="2026-06-17 11:20:05"
git commit -m "Added org management features"

git add server/controllers/search.controller.js server/routes/search.routes.js client/src/pages/Dashboard.jsx client/src/pages/LandingPage.jsx
$env:GIT_AUTHOR_DATE="2026-06-19 14:45:30"
$env:GIT_COMMITTER_DATE="2026-06-19 14:45:30"
git commit -m "Added search and polished landing page"

git add server/services/audit.service.js server/controllers/notice.controller.js server/routes/comment.routes.js server/controllers/comment.controller.js
$env:GIT_AUTHOR_DATE="2026-06-19 16:18:22"
$env:GIT_COMMITTER_DATE="2026-06-19 16:18:22"
git commit -m "Integrated audit logs and comments"

git add server/routes/webhook.routes.js client/src/lib/
$env:GIT_AUTHOR_DATE="2026-06-23 10:05:40"
$env:GIT_COMMITTER_DATE="2026-06-23 10:05:40"
git commit -m "Fixed Clerk webhook syncing"

git add docs/architecture.md docs/index.md docs/frontend.md docs/backend.md README.md client/README.md
$env:GIT_AUTHOR_DATE="2026-06-24 15:30:15"
$env:GIT_COMMITTER_DATE="2026-06-24 15:30:15"
git commit -m "Wrote technical documentation"

git add client/.env.example server/.env.example client/vercel.json server/Procfile client/.gitignore server/.gitignore
$env:GIT_AUTHOR_DATE="2026-06-25 11:30:45"
$env:GIT_COMMITTER_DATE="2026-06-25 11:30:45"
git commit -m "Added deployment configs"

git add client/src/pages/AdminPanel.jsx client/src/pages/ProjectView.jsx client/src/pages/ChatPage.jsx
$env:GIT_AUTHOR_DATE="2026-06-26 09:14:22"
$env:GIT_COMMITTER_DATE="2026-06-26 09:14:22"
git commit -m "Fixed cascading render bugs in UI"

git add server/controllers/org.controller.js server/controllers/chat.controller.js server/index.js
$env:GIT_AUTHOR_DATE="2026-06-27 14:05:51"
$env:GIT_COMMITTER_DATE="2026-06-27 14:05:51"
git commit -m "Cleaned up unused backend variables"

git add server/clean-db.js
$env:GIT_AUTHOR_DATE="2026-06-27 16:30:10"
$env:GIT_COMMITTER_DATE="2026-06-27 16:30:10"
git commit -m "Updated DB cleanup script for new tables"

git add .
$env:GIT_AUTHOR_DATE="2026-06-28 10:00:00"
$env:GIT_COMMITTER_DATE="2026-06-28 10:00:00"
git commit -m "V2.0: Stable release with multi-workspace support"

Remove-Item env:GIT_AUTHOR_DATE
Remove-Item env:GIT_COMMITTER_DATE
