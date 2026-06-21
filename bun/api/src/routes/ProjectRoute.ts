import { Hono } from "hono";
import { ProjectController } from "../controllers";
import { ProjectService } from "../services";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const projectService = new ProjectService();
const projectController = new ProjectController(projectService);

/**
 * Routes for the `/projects` resource.
 *
 * - POST   /            - create a project (owner from `x-user-id` header).
 * - GET    /users/:user_id - list a user's projects.
 * - GET    /:id         - fetch a single project.
 * - PATCH  /:id         - update a project.
 * - DELETE /:id         - delete a project.
 *
 * `/users/:user_id` has two path segments and `/:id` has one, so they don't
 * actually overlap - listed in this order purely to read top-to-bottom as
 * collection-then-single-resource.
 */
export const projectRoute = new Hono()
    .post('/', projectController.create)
    .get('/users/:user_id', projectController.getByUser)
    .get('/:id', projectController.getById)
    .patch('/:id', projectController.update)
    .delete('/:id', projectController.delete);
