import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../libs";
import { ProjectService } from "../services";

/**
 * HTTP layer for project-related endpoints (CRUD over the repositories a
 * user has registered for dependency scanning). Translates Hono `Context`
 * objects into `ProjectService` calls and maps the results to HTTP
 * responses/errors.
 */
export class ProjectController {
    constructor(private projectService: ProjectService) {
    }

    /**
     * POST /projects
     * Creates a project for the requesting user.
     *
     * The owning user is taken from the `x-user-id` header rather than the
     * request body, so the body itself stays agnostic of identity.
     *
     * @param c - Hono request context; expects an `x-user-id` header and a
     *   JSON body of `{ name, repo_url, description? }`.
     * @returns 201 JSON response with the created project document.
     * @throws {HTTPException} 400 if the header or required body fields are missing.
     */
    create = async (c: Context) => {
        const userId = c.req.header('x-user-id');

        if (!userId) {
            throw new HTTPException(400, { message: "Missing Header: x-user-id" });
        }

        const body = await c.req.json();
        const { name, repo_url, description } = body;

        if (!name || !repo_url) {
            throw new HTTPException(400, { message: "Missing Parameters: name, repo_url" });
        }

        logger.info({ userId, name, repo_url }, `${this.constructor.name}.${this.create.name}: Creating project`);

        const project = await this.projectService.create({ user_id: userId, name, repo_url, description });

        logger.info({ projectId: project.id }, `${this.constructor.name}.${this.create.name}: Project created`);

        return c.json(project, 201);
    }

    /**
     * GET /projects/:id
     * Fetches a single project by Mongo `_id`.
     *
     * @param c - Hono request context; expects an `id` route param.
     * @returns JSON response with the project document.
     * @throws {HTTPException} 400 if the `id` param is missing.
     * @throws {HTTPException} 404 if no project matches the given id.
     */
    getById = async (c: Context) => {
        const projectId = c.req.param('id');

        if (!projectId) {
            throw new HTTPException(400, { message: "Missing Parameters: projectId" });
        }

        const project = await this.projectService.getById(projectId);

        if (!project) {
            throw new HTTPException(404, { message: "Project not found" });
        }

        return c.json(project);
    }

    /**
     * GET /projects/users/:user_id
     * Lists every project owned by the given user.
     *
     * @param c - Hono request context; expects a `user_id` route param.
     * @returns JSON response with an array of project documents (possibly empty).
     * @throws {HTTPException} 400 if the `user_id` param is missing.
     */
    getByUser = async (c: Context) => {
        const userId = c.req.param('user_id');

        if (!userId) {
            throw new HTTPException(400, { message: "Missing Parameters: user_id" });
        }

        const projects = await this.projectService.getByUser(userId);

        return c.json(projects);
    }

    /**
     * PATCH /projects/:id
     * Partially updates a project's mutable fields.
     *
     * @param c - Hono request context; expects an `id` route param and a
     *   JSON body of `{ name?, repo_url?, description? }`.
     * @returns JSON response with the updated project document.
     * @throws {HTTPException} 400 if the `id` param is missing.
     * @throws {HTTPException} 404 if no project matches the given id.
     */
    update = async (c: Context) => {
        const projectId = c.req.param('id');

        if (!projectId) {
            throw new HTTPException(400, { message: "Missing Parameters: projectId" });
        }

        const body = await c.req.json();
        const project = await this.projectService.update(projectId, body);

        if (!project) {
            throw new HTTPException(404, { message: "Project not found" });
        }

        return c.json(project);
    }

    /**
     * DELETE /projects/:id
     * Deletes a project.
     *
     * @param c - Hono request context; expects an `id` route param.
     * @returns JSON response `{ success: true }` on deletion.
     * @throws {HTTPException} 400 if the `id` param is missing.
     * @throws {HTTPException} 404 if no project matches the given id.
     */
    delete = async (c: Context) => {
        const projectId = c.req.param('id');

        if (!projectId) {
            throw new HTTPException(400, { message: "Missing Parameters: projectId" });
        }

        const project = await this.projectService.delete(projectId);

        if (!project) {
            throw new HTTPException(404, { message: "Project not found" });
        }

        return c.json({ success: true });
    }
}
