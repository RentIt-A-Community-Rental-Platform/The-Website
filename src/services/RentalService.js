import { BaseService } from './BaseService.js';
import { Rental } from '../models/Rental.js';
import { Item } from '../models/Item.js';

export class RentalService extends BaseService {
    constructor() {
        super(Rental);
    }

    calculateTotalPrice(dailyRate, startDate, endDate, deposit) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end - start + 1) / (1000 * 60 * 60 * 24));
        return (days * dailyRate) + deposit;
    }

    async createRentalRequest(rentalData, userId) {
        try {
            const item = await Item.findById(rentalData.itemId);
            if (!item) {
                throw new Error('Item not found');
            }

            const totalPrice = this.calculateTotalPrice(
                item.price,
                rentalData.startDate,
                rentalData.endDate,
                item.deposit
            );

            const rental = await this.create({
                itemId: rentalData.itemId,
                renterId: userId,
                ownerId: item.userId,
                paymentMethod: rentalData.paymentMethod,
                meetingDetails: {
                    date: rentalData.meetingDate,
                    time: rentalData.meetingTime,
                    location: rentalData.meetingLocation,
                    notes: rentalData.notes || ''
                },
                rentalPeriod: {
                    startDate: rentalData.startDate,
                    endDate: rentalData.endDate
                },
                status: 'pending',
                totalPrice,
                chatHistory: rentalData.chatHistory || [],
                lastModifiedBy: userId
            });

            return rental;
        } catch (error) {
            throw new Error(`Error creating rental request: ${error.message}`);
        }
    }

    async getPendingRequests(userId) {
        try {
            return await this.model.find({
                ownerId: userId,
                status: { $in: ['pending', 'modified'] }
            })
            .populate('itemId')
            .populate('renterId');
        } catch (error) {
            throw new Error(`Error fetching pending requests: ${error.message}`);
        }
    }

    async getAllRequests(userId) {
        try {
            return await this.model.find({
                ownerId: userId,
                status: { $in: ['pending', 'modified','accepted','ongoing','completed'] }
            })
            .populate('itemId')
            .populate('renterId');
        } catch (error) {
            throw new Error(`Error fetching pending requests: ${error.message}`);
        }
    }

    async getUserRequests(userId,statuses=null) {
        try {
            if (statuses) {
                return await this.model.find({
                    renterId: userId,
                    status: { $in: statuses }
                })
               .populate('itemId')
              .populate('ownerId');
            }
            else{
                return await this.model.find({
                    renterId: userId
                })
                .populate('itemId')
                .populate('ownerId');
            }
        } catch (error) {
            throw new Error(`Error fetching user requests: ${error.message}`);
        }
    }

    async updateRentalStatus(rentalId, status, userId) {
        try {
            const rental = await this.model.findOneAndUpdate(
                { _id: rentalId },
                { status, lastModifiedBy: userId },
                { new: true }
            )
            .populate('itemId')
            .populate('ownerId')
            .populate('renterId');

            if (!rental) {
                throw new Error('Rental request not found or already processed');
            }

            return rental;
        } catch (error) {
            throw new Error(`Error updating rental status: ${error.message}`);
        }
    }

    async updateRental(rentalId, updateData, userId) {
        try {
            // First find the rental to determine sender type
            const existingRental = await this.model.findOne({ _id: rentalId })
                .populate('itemId')
                .populate('renterId')
                .populate('ownerId');

            if (!existingRental) {
                throw new Error('Rental request not found');
            }

            // Determine who is modifying
            let senderType = '';
            if (String(existingRental.ownerId._id) === String(userId)) {
                senderType = 'owner';
            } else if (String(existingRental.renterId._id) === String(userId)) {
                senderType = 'renter';
            } else {
                throw new Error('Not authorized to modify this request');
            }

            // Calculate new total price if rental period is being updated
            let totalPrice = existingRental.totalPrice;
            if (updateData.rentalPeriod) {
                totalPrice = this.calculateTotalPrice(
                    existingRental.itemId.price,
                    updateData.rentalPeriod.startDate,
                    updateData.rentalPeriod.endDate,
                    existingRental.itemId.deposit
                );
            }

            // Prepare the new chat message
            const chatMsg = {
                sender: senderType,
                type: 'modify',
                timestamp: new Date(),
                rentalPeriod: updateData.rentalPeriod || existingRental.rentalPeriod,
                meetingDetails: updateData.meetingDetails || existingRental.meetingDetails,
                message: updateData.meetingDetails?.notes || ''
            };

            // Update the rental with new data and chat message
            const rental = await this.model.findOneAndUpdate(
                { _id: rentalId },
                {
                    ...updateData,
                    totalPrice,
                    status: 'modified',
                    lastModifiedBy: userId,
                    $push: { chatHistory: chatMsg }
                },
                { new: true }
            )
            .populate('itemId')
            .populate('renterId')
            .populate('ownerId');

            return rental;
        } catch (error) {
            throw new Error(`Error updating rental request: ${error.message}`);
        }
    }

    async confirmPickup(rentalId, userId) {
        try {
            const rental = await this.model.findOneAndUpdate(
                { _id: rentalId },
                { 
                    status: 'ongoing',
                    lastModifiedBy: userId 
                },
                { new: true }
            )
            .populate('itemId')
            .populate('ownerId')
            .populate('renterId');

            if (!rental) {
                throw new Error('Rental request not found');
            }

            return rental;
        } catch (error) {
            throw new Error(`Error confirming pickup: ${error.message}`);
        }
    }

    async confirmReturn(rentalId, userId) {
        try {
            const rental = await this.model.findOneAndUpdate(
                { _id: rentalId },
                { 
                    status: 'completed',
                    lastModifiedBy: userId 
                },
                { new: true }
            )
            .populate('itemId')
            .populate('ownerId')
            .populate('renterId');

            if (!rental) {
                throw new Error('Rental request not found');
            }

            return rental;
        } catch (error) {
            throw new Error(`Error confirming return: ${error.message}`);
        }
    }

    async getRequestsByStatus(userId,status) {
        try {
            return await this.model.find({
                ownerId: userId,
                status: status
            })
            .populate('itemId')
            .populate('renterId')
            .populate('ownerId');
        } catch (error) {
            throw new Error(`Error fetching requests with status ${status}: ${error.message}`);
        }
    }

    // If you need multiple statuses
    async getRequestsByStatuses(userId,statuses) {
        try {
            return await this.model.find({
                ownerId: userId,
                status: { $in: statuses }
            })
            .populate('itemId')
            .populate('renterId')
            .populate('ownerId');
        } catch (error) {
            throw new Error(`Error fetching requests with statuses ${statuses.join(', ')}: ${error.message}`);
        }
    }
}