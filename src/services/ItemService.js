import { BaseService } from './BaseService.js';
import { Item } from '../models/Item.js';

export class ItemService extends BaseService {
    constructor() {
        super(Item);
    }

    async getAllItems(query = {}) {
        try {
            return await this.model.find(query).sort({ createdAt: -1 });
        } catch (error) {
            throw new Error(`Error fetching items: ${error.message}`);
        }
    }

    async getUserItems(userId) {
        try {
            return await this.model.find({ userId }).sort({ createdAt: -1 });
        } catch (error) {
            throw new Error(`Error fetching user items: ${error.message}`);
        }
    }

    async getExcludeUserItems(userId) {
        try {
            return await this.model.find({ userId: { $ne: userId } }).sort({ createdAt: -1 });
        } catch (error) {
            throw new Error(`Error fetching excluded user items: ${error.message}`);
        }
    }

    async createItem(itemData, userId, userName) {
        try {
            const item = await this.create({
                ...itemData,
                userId,
                userName,
                price: parseFloat(itemData.price),
                deposit: parseFloat(itemData.deposit),
                photos: Array.isArray(itemData.photos) ? itemData.photos : JSON.parse(itemData.photos)
            });
            return item;
        } catch (error) {
            throw new Error(`Error creating item: ${error.message}`);
        }
    }
}