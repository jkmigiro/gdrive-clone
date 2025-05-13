import { DBService } from './DBService';
import { KafkaService } from './KafkaService';
import { CustomError } from '../errors/CustomError';
import { UserService } from './UserService';
import { Post } from '../models/Post';
import { getMessage } from '../util/message';
import { v4 as uuidv4 } from 'uuid';

interface RegistrationLevel {
  id: string;
  post_id: string;
  title: string;
  price: number;
  description?: string;
  benefits: string[];
}

interface PaymentData {
  user_id: number;
  post_id: string;
  amount: number;
  registration_level_id?: string;
}

export class EventPaymentService {
  private dbService: DBService;
  private kafkaService: KafkaService;
  private userService: UserService;

  constructor(dbService: DBService, kafkaService: KafkaService, userService: UserService) {
    this.dbService = dbService;
    this.kafkaService = kafkaService;
    this.userService = userService;
  }

  async addRegistrationLevel(postId: string, userId: number, data: Omit<RegistrationLevel, 'id' | 'post_id'>): Promise<{ success: boolean; registration_level: RegistrationLevel }> {
    try {
      const post = await this.dbService.getPostById(postId);
      if (!post) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);
      if (post.user.id !== userId) throw new CustomError('User not authorized to add registration level', 403);
      if (post.type !== 'event') throw new CustomError('Registration levels can only be added to event posts', 400);

      const registrationLevel: RegistrationLevel = {
        id: uuidv4(),
        post_id: postId,
        ...data,
      };

      const createdLevel = await this.dbService.addRegistrationLevel(registrationLevel);
      return { success: true, registration_level: createdLevel };
    } catch (error) {
      throw error;
    }
  }

  async editRegistrationLevel(levelId: string, userId: number, data: Partial<Omit<RegistrationLevel, 'id' | 'post_id'>>): Promise<{ success: boolean; registration_level: RegistrationLevel }> {
    try {
      const level = await this.dbService.getRegistrationLevelById(levelId);
      if (!level) throw new CustomError('Registration level not found', 404);

      const post = await this.dbService.getPostById(level.post_id);
      if (!post) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);
      if (post.user.id !== userId) throw new CustomError('User not authorized to edit registration level', 403);

      const updatedLevel = await this.dbService.updateRegistrationLevel(levelId, data);
      return { success: true, registration_level: updatedLevel };
    } catch (error) {
      throw error;
    }
  }

  async removeRegistrationLevel(levelId: string, userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const level = await this.dbService.getRegistrationLevelById(levelId);
      if (!level) throw new CustomError('Registration level not found', 404);

      const post = await this.dbService.getPostById(level.post_id);
      if (!post) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);
      if (post.user.id !== userId) throw new CustomError('User not authorized to remove registration level', 403);

      await this.dbService.removeRegistrationLevel(levelId);
      return { success: true, message: 'Registration level removed successfully' };
    } catch (error) {
      throw error;
    }
  }

  async processEventPayment(data: PaymentData): Promise<{ success: boolean; message: string }> {
    try {
      const { user_id, post_id, amount, registration_level_id } = data;
      const post = await this.dbService.getPostById(post_id);
      if (!post) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);
      if (post.type !== 'event') throw new CustomError('Payments can only be processed for event posts', 400);

      const user = await this.userService.getUserById(user_id);
      if (!user) throw new CustomError(getMessage('USER_NOT_FOUND'), 404);

      let registrationLevel;
      if (registration_level_id) {
        registrationLevel = await this.dbService.getRegistrationLevelById(registration_level_id);
        if (!registrationLevel) throw new CustomError('Registration level not found', 404);
        if (registrationLevel.price !== amount) throw new CustomError('Payment amount does not match registration level price', 400);
      }

      const payment = {
        id: uuidv4(),
        user_id,
        post_id,
        amount,
        registration_level_id,
        created_at: new Date(),
      };

      await this.dbService.processEventPayment(payment);
      await this.kafkaService.publishKafkaMessage({
        event: 'EVENT_PAYMENT',
        message: JSON.stringify({
          user_id,
          post_id,
          payment_id: payment.id,
          message: `${user.first_name || user.org_name} made a payment for your event`,
          topic: 'event_payment',
          data: { post, payment, action_user: user },
        }),
      });

      return { success: true, message: 'Payment processed successfully' };
    } catch (error) {
      throw error;
    }
  }

  async withdrawEventPayment(postId: string, userId: number, amount: number): Promise<{ success: boolean; message: string }> {
    try {
      const post = await this.dbService.getPostById(postId);
      if (!post) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);
      if (post.user.id !== userId) throw new CustomError('User not authorized to withdraw payment', 403);
      if (post.type !== 'event') throw new CustomError('Withdrawals can only be processed for event posts', 400);

      const totalPayments = await this.dbService.getTotalEventPayments(postId);
      if (amount > totalPayments) throw new CustomError('Withdrawal amount exceeds available funds', 400);

      const withdrawal = {
        id: uuidv4(),
        user_id: userId,
        post_id: postId,
        amount,
        created_at: new Date(),
      };

      await this.dbService.processWithdrawal(withdrawal);
      await this.kafkaService.publishKafkaMessage({
        event: 'EVENT_WITHDRAWAL',
        message: JSON.stringify({
          user_id: userId,
          post_id: postId,
          withdrawal_id: withdrawal.id,
          message: `Event organizer withdrew ${amount} from event funds`,
          topic: 'event_withdrawal',
          data: { post, withdrawal },
        }),
      });

      return { success: true, message: 'Withdrawal processed successfully' };
    } catch (error) {
      throw error;
    }
  }
}