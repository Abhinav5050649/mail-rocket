import { logger } from "../libs";

export class UserService {

    private users = [{id: '1', name: 'Alice'}]

    constructor() {

    }

    async get(userId: string) {
        try {
            const response = this.users.find(val => { val.id === userId })
            return response;
        } catch (error) {
            logger.error(`Exception in ${this.constructor.name}.${this.get.name}: Failed to get user`);
            throw error;   
        }
    }
}