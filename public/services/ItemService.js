class ItemService {
    constructor() {
        this.API_URL = 'http://localhost:3000';
    }

    async createItem(itemData) {
        try {
            const response = await fetch(`${this.API_URL}/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
                },
                body: JSON.stringify(itemData)
            });

            if (!response.ok) {
                throw new Error('Failed to create item');
            }

            return await response.json();
        } catch (error) {
            throw new Error('Failed to create item: ' + error.message);
        }
    }

    async getItems(userId = null) {
        try {
            const url = userId ? `${this.API_URL}/items?userId=${userId}` : `${this.API_URL}/items`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Failed to fetch items');
            }

            return await response.json();
        } catch (error) {
            throw new Error('Failed to fetch items: ' + error.message);
        }
    }

    async getItemById(id) {
        try {
            const response = await fetch(`${this.API_URL}/items/${id}`);
            
            if (!response.ok) {
                throw new Error('Item not found');
            }

            return await response.json();
        } catch (error) {
            throw new Error('Failed to fetch item: ' + error.message);
        }
    }

    async updateItem(id, updateData) {
        try {
            const response = await fetch(`${this.API_URL}/items/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw new Error('Failed to update item');
            }

            return await response.json();
        } catch (error) {
            throw new Error('Failed to update item: ' + error.message);
        }
    }

    async deleteItem(id) {
        try {
            const response = await fetch(`${this.API_URL}/items/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete item');
            }

            return await response.json();
        } catch (error) {
            throw new Error('Failed to delete item: ' + error.message);
        }
    }
}

export default new ItemService();