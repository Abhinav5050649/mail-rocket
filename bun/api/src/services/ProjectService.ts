import { logger } from "../libs";
import { ProjectModel } from "../models";

/** Fields accepted when creating a new project document. */
export interface CreateProjectInput {
    user_id: string;
    name: string;
    repo_url: string;
    description?: string;
}

/** Fields accepted when partially updating an existing project document. */
export interface UpdateProjectInput {
    name?: string;
    repo_url?: string;
    description?: string;
}

/**
 * Data-access layer for `Project` documents (repositories a user has
 * registered for dependency scanning). Wraps `ProjectModel` (Mongoose) and
 * adds structured logging around every operation: an `info` log when the
 * operation starts, `info`/`warn` on completion depending on whether a
 * document was found, and `error` (with the full stack via the pino `err`
 * serializer) if the underlying query throws.
 */
export class ProjectService {

    /**
     * Creates a new project document.
     *
     * @param data - Fields for the new project, including the owning `user_id`.
     * @returns The created project document.
     * @throws Re-throws any error from the underlying Mongoose call, after logging it.
     */
    async create(data: CreateProjectInput) {
        try {
            logger.info({ data }, `${this.constructor.name}.${this.create.name}: Creating project`);

            const project = await ProjectModel.create(data);

            logger.info({ projectId: project.id }, `${this.constructor.name}.${this.create.name}: Project created`);

            return project;
        } catch (error) {
            logger.error({ err: error, data }, `Exception in ${this.constructor.name}.${this.create.name}: Failed to create project`);
            throw error;
        }
    }

    /**
     * Fetches a single project by Mongo `_id`.
     *
     * @param projectId - Mongo `_id` of the project.
     * @returns The project document, or `null` if no match exists.
     * @throws Re-throws any error from the underlying Mongoose call (e.g. a
     *   malformed `_id`), after logging it.
     */
    async getById(projectId: string) {
        try {
            logger.info({ projectId }, `${this.constructor.name}.${this.getById.name}: Fetching project`);

            const project = await ProjectModel.findById(projectId);

            if (!project) {
                logger.warn({ projectId }, `${this.constructor.name}.${this.getById.name}: Project not found`);
                return project;
            }

            logger.info({ projectId }, `${this.constructor.name}.${this.getById.name}: Project fetched`);

            return project;
        } catch (error) {
            logger.error({ err: error, projectId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get project`);
            throw error;
        }
    }

    /**
     * Lists every project owned by a given user.
     *
     * @param userId - Mongo `_id` of the owning user.
     * @returns Array of matching project documents (empty if none exist).
     * @throws Re-throws any error from the underlying Mongoose call, after logging it.
     */
    async getByUser(userId: string) {
        try {
            logger.info({ userId }, `${this.constructor.name}.${this.getByUser.name}: Fetching projects for user`);

            const projects = await ProjectModel.find({ user_id: userId });

            logger.info({ userId, count: projects.length }, `${this.constructor.name}.${this.getByUser.name}: Fetched projects for user`);

            return projects;
        } catch (error) {
            logger.error({ err: error, userId }, `Exception in ${this.constructor.name}.${this.getByUser.name}: Failed to get projects for user`);
            throw error;
        }
    }

    /**
     * Partially updates a project document.
     *
     * @param projectId - Mongo `_id` of the project to update.
     * @param data - Fields to update.
     * @returns The updated project document, or `null` if no match exists.
     * @throws Re-throws any error from the underlying Mongoose call, after logging it.
     */
    async update(projectId: string, data: UpdateProjectInput) {
        try {
            logger.info({ projectId, data }, `${this.constructor.name}.${this.update.name}: Updating project`);

            const project = await ProjectModel.findByIdAndUpdate(projectId, data, { new: true });

            if (!project) {
                logger.warn({ projectId }, `${this.constructor.name}.${this.update.name}: Project not found`);
                return project;
            }

            logger.info({ projectId }, `${this.constructor.name}.${this.update.name}: Project updated`);

            return project;
        } catch (error) {
            logger.error({ err: error, projectId, data }, `Exception in ${this.constructor.name}.${this.update.name}: Failed to update project`);
            throw error;
        }
    }

    /**
     * Deletes a project document.
     *
     * @param projectId - Mongo `_id` of the project to delete.
     * @returns The deleted project document, or `null` if no match exists.
     * @throws Re-throws any error from the underlying Mongoose call, after logging it.
     */
    async delete(projectId: string) {
        try {
            logger.info({ projectId }, `${this.constructor.name}.${this.delete.name}: Deleting project`);

            const project = await ProjectModel.findByIdAndDelete(projectId);

            if (!project) {
                logger.warn({ projectId }, `${this.constructor.name}.${this.delete.name}: Project not found`);
                return project;
            }

            logger.info({ projectId }, `${this.constructor.name}.${this.delete.name}: Project deleted`);

            return project;
        } catch (error) {
            logger.error({ err: error, projectId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete project`);
            throw error;
        }
    }
}
