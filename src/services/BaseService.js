import mongoose from 'mongoose';

export class BaseService {
    constructor(model) {
        this.model = model;
    }

    async findById(id) {
        try {
            return await this.model.findById(id);
        } catch (error) {
            throw new Error(`Error finding by id: ${error.message}`);
        }
    }

    async findOne(conditions) {
        try {
            return await this.model.findOne(conditions);
        } catch (error) {
            throw new Error(`Error finding one: ${error.message}`);
        }
    }

    async create(data) {
        try {
            const instance = new this.model(data);
            return await instance.save();
        } catch (error) {
            throw new Error(`Error creating: ${error.message}`);
        }
    }

    async update(id, data) {
        try {
            return await this.model.findByIdAndUpdate(id, data, { new: true });
        } catch (error) {
            throw new Error(`Error updating: ${error.message}`);
        }
    }

    async delete(id) {
        try {
            return await this.model.findByIdAndDelete(id);
        } catch (error) {
            throw new Error(`Error deleting: ${error.message}`);
        }
    }
}