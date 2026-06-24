# ⚙️ Backend Architecture Deep Dive

The backend is built to guarantee ACID compliance for core relational entities while maintaining non-blocking, asynchronous throughput for high-volume unstructured logs.

## Express Middleware Pipeline

Every incoming request traverses a strict security and parsing pipeline before reaching business logic:
1.  **`cors`**: Validates the origin against the `CLIENT_URL` configurations to prevent unauthorized cross-origin requests.
2.  **`helmet`**: Injects crucial HTTP security headers (e.g., `X-DNS-Prefetch-Control`, `X-Frame-Options`) to mitigate XSS and clickjacking.
3.  **`express-rate-limit`**: Mitigates DDOS and brute-force attempts on API endpoints.
4.  **`compression()`**: Gzip compresses outgoing streams to reduce payload sizes and improve latency.
5.  **`@clerk/express` Auth Middleware**: Extracts the Bearer token, validates the JWT cryptographically, and populates the request context with `req.auth.userId`.

## ACID Compliance via Prisma Transactions

Complex operations, such as creating a task and immediately assigning multiple users to it, cannot afford partial failures (e.g., the task is created but the assignees are not mapped).

**Implementation Pattern (`createTask` in `task.controller.js`):**
```javascript
const task = await prisma.$transaction(async (tx) => {
  const newTask = await tx.task.create({ data: { title, projectId } });
  
  if (assigneeIds.length > 0) {
    // Write assignees. If this fails, the task creation rolls back automatically.
    await tx.taskAssignee.createMany({ ... });
  }
  return newTask;
});
```
This `prisma.$transaction` block ensures that if any part of the logic fails (e.g., attempting to assign an invalid `userId`), the initial `task.create` is rolled back at the database level instantly, preventing corrupted or orphaned rows from entering the PostgreSQL tables.

## Fire-and-Forget MongoDB Audit Service

To prevent logging mechanisms from artificially slowing down the REST endpoints, the `auditService.log()` function is designed as a non-blocking, fire-and-forget Promise.

**Implementation (`audit.service.js`):**
```javascript
export const auditService = {
  async log({ action, userId, projectId, metadata = {} }) {
    try {
      await ActivityLog.create({ action, userId, projectId, metadata });
    } catch (error) {
      console.error("[Audit Service] Failed to log activity", error);
      // Fails silently - An audit failure does not crash the main transaction
    }
  }
}
```
Because `ActivityLog` is stored in MongoDB, inserting thousands of logs per minute will not fragment the PostgreSQL indexes. This design ensures that the core relational CRUD performance is fully insulated from the heavy I/O of the audit pipeline.

## Centralized Error Handling

Controllers are completely devoid of repetitive `res.status(500)` boilerplate blocks. Every controller wraps its logic in a clean `try/catch` block and simply invokes `next(error)`.
The Express global error handler catches the thrown object, sanitizes the stack trace in `production` environments to prevent code structure leakage, and outputs a uniform JSON error payload back to the client.

---
*Return to [Index](index.md)*
