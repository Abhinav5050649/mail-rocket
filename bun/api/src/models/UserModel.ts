import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * Mongoose schema for a user, authenticated via GitHub OAuth.
 * Fields are snake_case by convention, matching the wire format used by the
 * rest of the API and by GitHub's own API.
 */
const userSchema = new Schema(
    {
        /** GitHub's numeric user id - the real identity anchor, unique per account. */
        github_id: { type: Number, required: true, unique: true },
        /** GitHub login/handle. */
        username: { type: String, required: true },
        /** Display name from the GitHub profile. */
        name: { type: String },
        /** Email from the GitHub profile; omitted if the user keeps it private. */
        email: { type: String },
        /** Profile picture URL from the GitHub profile. */
        avatar_url: { type: String },
        /** Timestamp of the user's most recent OAuth login. */
        last_login_at: { type: Date },
    },
    // Renamed from Mongoose's default camelCase createdAt/updatedAt to keep
    // every persisted attribute snake_case.
    { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

/** TS type for a user document, inferred directly from the schema above. */
export type IUser = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);
