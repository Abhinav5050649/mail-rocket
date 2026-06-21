import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * Mongoose schema for a project: a repository a user has registered for
 * dependency-compromise scanning. Fields are snake_case by convention,
 * matching the wire format used by the rest of the API.
 */
const projectSchema = new Schema(
    {
        /** Owning user's `_id`. Mongoose's equivalent of a foreign key (no DB-level constraint, enforced at the application layer). */
        user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        /** Display name for the project. */
        name: { type: String, required: true },
        /** URL of the repository to scan. */
        repo_url: { type: String, required: true },
        /** Optional free-text description. */
        description: { type: String },
    },
    // Renamed from Mongoose's default camelCase createdAt/updatedAt to keep
    // every persisted attribute snake_case.
    { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

/** TS type for a project document, inferred directly from the schema above. */
export type IProject = InferSchemaType<typeof projectSchema>;
export const ProjectModel = model("Project", projectSchema);
