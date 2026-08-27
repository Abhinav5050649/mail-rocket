/**
 * A business-rule violation that a controller should translate into a 400
 * response, as opposed to an unexpected failure that should fall through to
 * the global error handler as a 500.
 */
export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
}
