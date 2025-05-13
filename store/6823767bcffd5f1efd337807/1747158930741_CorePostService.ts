```typescript
import DBService from './DbService';
import kafkaService from './kafkaService';
import CustomError from '../errors/CustomError';
import { Types } from 'mongoose';
import { z } from 'zod';
import { validateMongoId } from '../util/MongoUtils';
import { formatPostData } from '../util/postHelpers';
import userService from './userService';
import BaseService from './BaseService';
import {
  Post,
  EventPost,
  PaidEventPost,
  GoalPost,
  ProductPost,
  ReelPost,
  SocialPost,
  PostModel,
  PostSchema,
  EventPostSchema,
  PaidEventPostSchema,
  GoalPostSchema,
  ProductPostSchema,
  ReelPostSchema,
  SocialPostSchema,
  UserTag,
  AdditionalField,
  PostType,
  PostTypeEnum,
} from '../models/mongo/ts/Post';
import { getMessage } from '../util/message';
import { ImageUploader } from '../middlewares/processImageMiddleware';

// Interfaces
interface PostData {
  type?: PostType;
  user_id: number;
  purpose: string;
  description: string | string[];
  media?: object[];
  tags?: UserTag[];
  show_on_post_feed?: boolean;
  background_color?: string | null;
  reference_post_ids?: Types.ObjectId[];
  parent_post_id?: Types.ObjectId | null;
  event_category?: string;
  event_permissions?: any;
  event_date_time?: Date;
  event_date_time_end?: Date;
  event_address?: string;
  additional_fields?: AdditionalField[];
  max_participants?: number;
  participants?: number[];
  participants_with_joining_date?: { user_id: number; joined_at: Date }[];
  paid_event?: boolean;
  closed_event?: boolean;
  close_date?: Date;
  location?: { long?: number; lat?: number };
  timezone?: string;
  terms_and_conditions?: string;
  additional_info?: string;
  stop_registration?: boolean;
  geo_location?: { type: 'Point'; coordinates: [number, number] };
  sitemap?: any;
  deadline?: Date;
  deadline_end?: Date;
  connect_with_event_attendees_reminder_sent?: boolean;
  first_event_attendee_registered?: boolean;
  one_day_to_event_reminder_sent?: boolean;
  day_of_event_reminder_sent?: boolean;
  ten_hours_to_event_reminder_sent?: boolean;
  one_day_after_event_reminder_sent?: boolean;
  two_hours_after_event_creation_reminder_sent?: boolean;
  last_daily_event_payments_summary_sent_date?: string;
  required_amount?: number;
  current_amount?: number;
  price?: number;
  bank_id?: number;
  organizer_bank_account_details?: Array<{
    account_name: string;
    account_number: string;
    swift_code?: string;
    bank_name: string;
  }>;
  withdrawn?: boolean;
  video_url?: string[];
}

export const sendUpdatedPostToKafka = async (post_id: string, user_id: number): Promise<void> => {
  try {
    const postResponse = await DBService.getPostById(post_id, user_id);
    if (!postResponse?.success) return;
    const kafkaData = formatPostData(postResponse, user_id);
    await kafkaService.createPostForRecommendationToKafka(kafkaData);
  } catch (error) {
    console.error('Error sending updated post to Kafka:', error);
  }
};

export class PostService extends BaseService {
  private dbService: DBService;
  private kafkaService: typeof kafkaService;
  private allowedDeletedPix: number = parseInt(process.env.ALLOWED_DELETED_PIX || '2');

  constructor(dbService: DBService, kafkaServiceInstance: typeof kafkaService) {
    super();
    this.dbService = dbService;
    this.kafkaService = kafkaServiceInstance;
  }

  private validatePostData(data: Partial<PostData>, schema: z.ZodSchema): PostData {
    try {
      return schema.parse(data) as PostData;
    } catch (error) {
      const zodError = error as z.ZodError;
      throw new CustomError(`Validation failed: ${zodError.errors.map(e => e.message).join(', ')}`, 400);
    }
  }

  private getPostSchema(type: PostType): z.ZodSchema {
    switch (type) {
      case PostTypeEnum.Event:
        return EventPostSchema;
      case PostTypeEnum.PaidEvent:
        return PaidEventPostSchema;
      case PostTypeEnum.Goal:
        return GoalPostSchema;
      case PostTypeEnum.Products:
        return ProductPostSchema;
      case PostTypeEnum.Reels:
        return ReelPostSchema;
      case PostTypeEnum.Social:
        return SocialPostSchema;
      case PostTypeEnum.Service:
        return ProductPostSchema; // Service treated as product
      default:
        return PostSchema;
    }
  }

  async createPost(
    data: Partial<PostData>,
    imageUrl?: object,
    videoUrl?: string,
  ): Promise<{ success: boolean; post: Post; message: string }> {
    try {
      const type = data.type || PostTypeEnum.Social;
      const schema = this.getPostSchema(type);
      const validatedData = this.validatePostData({ ...data, type }, schema);

      const {
        purpose,
        description,
        user_id,
        event_address,
        event_date_time,
        required_amount = 0,
        current_amount = 0,
        bank_id,
        price,
        deadline_end,
        event_date_time_end,
        timezone,
        event_category,
        long,
        lat,
        sitemap,
        additional_info,
        background_color,
        parent_post_id,
        max_participants,
        paid_event,
        show_on_post_feed,
        event_permissions,
        terms_and_conditions,
        stop_registration,
        closed_event,
        close_date,
        organizer_bank_account_details,
        tags,
        additional_fields,
      } = validatedData;

      const media = imageUrl ? [imageUrl] : data.media || [];
      const descriptions = Array.isArray(description) ? description : [description];

      const postData: Partial<Post> = {
        user_id,
        purpose,
        description: descriptions,
        media,
        type,
        created_at: new Date(),
        updated_at: new Date(),
        tags,
        show_on_post_feed: show_on_post_feed ?? true,
        background_color,
        parent_post_id,
      };

      if (type === PostTypeEnum.Event || type === PostTypeEnum.PaidEvent) {
        Object.assign(postData, {
          event_address,
          event_date_time,
          deadline_end,
          event_date_time_end,
          timezone,
          event_category,
          sitemap,
          additional_info,
          paid_event,
          event_permissions,
          terms_and_conditions,
          stop_registration,
          closed_event,
          close_date,
          additional_fields,
          connect_with_event_attendees_reminder_sent: false,
          first_event_attendee_registered: false,
          one_day_to_event_reminder_sent: false,
          day_of_event_reminder_sent: false,
          ten_hours_to_event_reminder_sent: false,
          one_day_after_event_reminder_sent: false,
          two_hours_after_event_creation_reminder_sent: false,
          max_participants: max_participants ? parseInt(max_participants.toString()) : undefined,
          required_amount: parseInt(required_amount.toString(), 10),
          current_amount: parseInt(current_amount.toString(), 10),
        });
      }

      if (type === PostTypeEnum.PaidEvent) {
        Object.assign(postData, {
          bank_id,
          organizer_bank_account_details,
          price: price ? parseInt(price.toString(), 10) : undefined,
          withdrawn: false,
        });
      }

      if (type === PostTypeEnum.Goal) {
        Object.assign(postData, {
          required_amount: parseInt(required_amount.toString(), 10),
          current_amount: parseInt(current_amount.toString(), 10),
          deadline: data.deadline,
          deadline_end,
        });
      }

      if (type === PostTypeEnum.Reels) {
        if (!videoUrl) throw new CustomError('Reel has no video', 400);
        postData.video_url = [videoUrl];
      }

      if (type === PostTypeEnum.Products || type === PostTypeEnum.Service) {
        if (!price) throw new CustomError(getMessage('ERROR_PRODUCT_SERVICE_PRICE_REQUIRED'), 400);
        postData.type = PostTypeEnum.Products;
        postData.price = parseInt(price.toString(), 10);
      }

      if (long && lat) {
        postData.location = { long: Number(long), lat: Number(lat) };
        postData.geo-location = { type: 'Point', coordinates: [Number(long), Number(lat)] };
      } else if (type === PostTypeEnum.Event || type === PostTypeEnum.PaidEvent) {
        throw new CustomError(getMessage('ERROR_NO_LOCATION_FOR_EVENT'), 400);
      }

      let parentPost: Post | null = null;
      if (parent_post_id) {
        parentPost = await this.dbService.getPostById(parent_post_id.toString());
        if (!parentPost) {
          console.warn(`Parent post with id ${parent_post_id} not found`);
        }
      }

      const newPost = await this.dbService.createPost(postData);

      if (parentPost && parentPost.type === PostTypeEnum.Event) {
        await this.dbService.addReferencePost(parent_post_id!.toString(), newPost.id);
      }

      const user = await this.dbService.getUserById(user_id);
      newPost.participants = [user];
      newPost.reactions = 0;
      newPost.sharesCount = 0;
      newPost.likesCount = 0;
      newPost.numberOfComments = 0;

      await this.kafkaService.createPostForRecommendationToKafka(newPost);

      if (type === PostTypeEnum.Event || type === PostTypeEnum.PaidEvent) {
        await this.sendEventIsLiveToKafka(user_id, newPost);
        generateEventCalendar(newPost); // Ensure this function exists
      }

      return {
        success: true,
        post: newPost,
        message: getMessage('POST_CREATED_SUCCESSFULLY'),
      };
    } catch (error) {
      throw error instanceof CustomError ? error : new CustomError('Failed to create post', 500, error);
    }
  }

  async getAllPosts(
    userId: number,
    low_limit: number,
    upper_limit: number,
    commentPage: number,
    commentPageSize: number,
  ): Promise<{ success: boolean; posts: Post[]; message?: string }> {
    try {
      const posts = await this.dbService.getAllPosts(low_limit, upper_limit, commentPage, commentPageSize);
      if (!Array.isArray(posts.results) || posts.results.length === 0) {
        return { success: true, posts: [], message: getMessage('NO_POSTS_FOUND') };
      }

      const formattedPosts = await this.formatPosts(posts.results, userId, commentPage, commentPageSize);
      return { success: true, posts: formattedPosts };
    } catch (error) {
      throw new CustomError('Failed to fetch posts', 500, error);
    }
  }

  async fetchPostsNearMe(
    userId: number,
    low_limit: number,
    upper_limit: number,
    commentPage: number,
    commentPageSize: number,
  ): Promise<{ success: boolean; posts: Post[]; message?: string }> {
    try {
      const user = await this.dbService.getUserById(userId);
      if (!user) throw new CustomError('User not found', 404);

      const top10Socials = await this.getTop10SocialIds();
      const maoneyAdminId = parseInt(process.env.MAONEY_ADMIN_ID || '1');
      if (!isNaN(maoneyAdminId)) top10Socials.push(maoneyAdminId);

      const connectedUserIds = await this.getTopConnections(userId);
      connectedUserIds.push(userId);
      const socials = Array.from(new Set(top10Socials.concat(connectedUserIds)));

      const posts = await this.dbService.fetchAllPostsNearMe(
        userId,
        user.radius || parseInt(process.env.DEFAULT_SEARCH_RADIUS || '10'),
        socials,
        low_limit,
        upper_limit,
        commentPage,
        commentPageSize,
      );

      if (!Array.isArray(posts.results) || posts.results.length === 0) {
        return { success: true, posts: [], message: getMessage('NO_POSTS_FOUND') };
      }

      const formattedPosts = await this.formatPosts(posts.results, userId, commentPage, commentPageSize);
      return { success: true, posts: formattedPosts };
    } catch (error) {
      throw new CustomError('Failed to fetch nearby posts', 500, error);
    }
  }

  async getAllUserProductPosts(
    userId: number,
    low_limit: number,
    upper_limit: number,
    commentPage: number,
    commentPageSize: number,
  ): Promise<{ success: boolean; posts: Post[] }> {
    try {
      const posts = await this.dbService.getAllUserProductPosts(userId, low_limit, upper_limit);
      if (!Array.isArray(posts.results) || posts.results.length === 0) {
        return { success: true, posts: [] };
      }

      const formattedPosts = await this.formatPosts(posts.results, userId, commentPage, commentPageSize);
      return { success: true, posts: formattedPosts };
    } catch (error) {
      throw new CustomError('Failed to fetch user product posts', 500, error);
    }
  }

  async getAllEventPosts(
    userId: number,
    low_limit: number,
    upper_limit: number,
    commentPage: number,
    commentPageSize: number,
    start_date?: Date,
    end_date?: Date,
    event_category?: string,
    location?: string,
  ): Promise<{ success: boolean; posts: Post[] }> {
    try {
      const posts = await this.dbService.getAllEventPosts({
        low_limit,
        upper_limit,
        start_date,
        end_date,
        event_category,
        location,
      });

      if (!Array.isArray(posts) || posts.length === 0) {
        return { success: true, posts: [] };
      }

      const formattedPosts = await this.formatPosts(posts, userId, commentPage, commentPageSize);
      return { success: true, posts: formattedPosts };
    } catch (error) {
      throw new CustomError('Failed to fetch event posts', 500, error);
    }
  }

  async getAllUserPosts(
    userId: number,
    low_limit: number,
    upper_limit: number,
    commentPage: number,
    commentPageSize: number,
  ): Promise<{ success: boolean; posts: Post[] }> {
    try {
      const posts = await this.dbService.getAllUserPosts(userId, low_limit, upper_limit);
      if (!Array.isArray(posts.results) || posts.results.length === 0) {
        return { success: true, posts: [] };
      }

      const formattedPosts = await this.formatPosts(posts.results, userId, commentPage, commentPageSize);
      return { success: true, posts: formattedPosts };
    } catch (error) {
      throw new CustomError('Failed to fetch user posts', 500, error);
    }
  }

  async getAllUserEventPosts(
    userId: number,
    low_limit: number,
    upper_limit: number,
    commentPage: number,
    commentPageSize: number,
  ): Promise<{ success: boolean; posts: Post[] }> {
    try {
      const posts = await this.dbService.getAllUserEventPosts(userId, low_limit, upper_limit);
      if (!Array.isArray(posts.results) || posts.results.length === 0) {
        return { success: true, posts: [] };
      }

      const formattedPosts = await this.formatPosts(posts.results, userId, commentPage, commentPageSize);
      return { success: true, posts: formattedPosts };
    } catch (error) {
      throw new CustomError('Failed to fetch user event posts', 500, error);
    }
  }

  async getPostById(
    postId: string,
    userId: number,
    commentPage: number,
    commentPageSize: number,
    storyPage: number,
    storyPageSize: number,
  ): Promise<{ success: boolean; post: Post }> {
    try {
      validateMongoId(postId);
      const post = await this.dbService.getPostById(postId, commentPage, commentPageSize);
      if (!post) {
        throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);
      }

      const formattedPost = await formatPostData(post, userId, commentPage, commentPageSize);

      if (post.type === PostTypeEnum.Event || post.type === PostTypeEnum.PaidEvent) {
        formattedPost.key_attendees = await this.dbService.getKeyAttendeeByPostId(postId);
        formattedPost.event_staffs = await this.dbService.getEventStaffsByPostId(postId);
        formattedPost.announcements = await this.dbService.getAnnouncementByPostId(postId);
        formattedPost.main_agendas = await this.dbService.getMainAgendaByPostId(postId);
        formattedPost.fireside_agendas = await this.dbService.getFiresideAgendaByPostId(postId);
        formattedPost.vendors = await this.dbService.getVendorsByPostId(postId);
        formattedPost.participants = await this.getParticipants(formattedPost);

        if (post.reference_post_ids && post.reference_post_ids.length > 0) {
          const ref_posts = await Promise.all(
            post.reference_post_ids.map(async (id: Types.ObjectId) => {
              try {
                const reference_post = await this.dbService.getPostById(id.toString(), 0, 10);
                return await formatPostData(reference_post, reference_post.user.id);
              } catch (e) {
                console.error(e);
                return null;
              }
            }),
          );
          formattedPost.reference_posts = ref_posts.reverse().filter((p): p is Post => p !== null);
        }
        formattedPost.stories = await this.dbService.getStoriesByPostId(postId, storyPageSize, storyPage);
      }

      return { success: true, post: formattedPost };
    } catch (error) {
      throw new CustomError('Failed to fetch post', 500, error);
    }
  }

  async fetchReferencePosts(
    postId: string,
    page: number,
    pageSize: number,
    commentPage: number,
    commentPageSize: number,
  ): Promise<Post[]> {
    try {
      validateMongoId(postId);
      const post = await this.dbService.getPostById(postId);
      if (!post) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);

      if (!post.reference_post_ids || post.reference_post_ids.length === 0) return [];

      const paginatedIds = post.reference_post_ids.reverse().slice(page, page + pageSize);
      const reference_posts = await Promise.all(
        paginatedIds.map(async (id: Types.ObjectId) => {
          const ref_post = await this.dbService.getPostById(id.toString(), commentPage, commentPageSize);
          return ref_post ? await formatPostData(ref_post) : null;
        }),
      );

      return reference_posts.filter((p): p is Post => p !== null);
    } catch (error) {
      throw new CustomError('Failed to fetch reference posts', 500, error);
    }
  }

  async editPost(
    data: Partial<PostData>,
    imageUrl: string | undefined,
    postId: string,
  ): Promise<{ success: boolean; message: string; post: Post }> {
    try {
      validateMongoId(postId);
      const existingPost = await this.dbService.getPostById(postId);
      if (!existingPost) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);

      const schema = this.getPostSchema(existingPost.type);
      const validatedData = this.validatePostData({ ...data, type: existingPost.type }, schema);

      const {
        user_id,
        purpose,
        description,
        required_amount,
        deadline,
        current_amount,
        bank_id,
        event_address,
        event_date_time,
        delete_urls,
        event_date_time_end,
        deadline_end,
        timezone,
        event_category,
        price,
        long,
        lat,
        sitemap,
        additional_info,
        reference_post_id,
        background_color,
        show_on_post_feed,
        max_participants,
        event_permissions,
        terms_and_conditions,
        stop_registration,
        closed_event,
        close_date,
        organizer_bank_account_details,
        tags,
        additional_fields,
      } = validatedData;

      const updatedPostData: Partial<Post> = {};

      if (description) {
        updatedPostData.description = Array.isArray(description)
          ? [description[0], ...existingPost.description.slice(1)]
          : [description, ...existingPost.description.slice(1)];
      }

      let updatedMedia = existingPost.media;
      if (delete_urls) {
        const deleteUrlArr = delete_urls.split(',').map(url => url.trim());
        const deleteUrlSet = new Set(deleteUrlArr);

        updatedMedia = updatedMedia.map(media => {
          if (media.some((url: string) => deleteUrlSet.has(url))) {
            const newMedia = media.filter((url: string) => !deleteUrlSet.has(url));
            if (newMedia.length < this.allowedDeletedPix) {
              throw new CustomError(
                getMessage('CANNOT_DELETE_MIN_PICTURES', this.allowedDeletedPix),
                400,
              );
            }
            return newMedia;
          }
          return media;
        });
        updatedPostData.media = updatedMedia;
      }
      if (imageUrl) {
        updatedPostData.media = [...updatedMedia, imageUrl];
      }

      Object.assign(updatedPostData, {
        user_id: user_id ? parseInt(user_id.toString(), 10) : undefined,
        purpose,
        required_amount: required_amount ? parseInt(required_amount.toString(), 10) : undefined,
        deadline,
        current_amount: current_amount ? parseInt(current_amount.toString(), 10) : undefined,
        bank_id: bank_id ? parseInt(bank_id.toString(), 10) : undefined,
        price: price ? parseInt(price.toString(), 10) : undefined,
        show_on_post_feed,
        background_color,
        tags,
        additional_fields,
      });

      if (existingPost.type === PostTypeEnum.Event || existingPost.type === PostTypeEnum.PaidEvent) {
        Object.assign(updatedPostData, {
          event_address,
          event_date_time,
          deadline_end,
          event_date_time_end,
          timezone,
          event_category,
          sitemap,
          additional_info,
          max_participants: max_participants ? parseInt(max_participants.toString(), 10) : undefined,
          event_permissions,
          terms_and_conditions,
          stop_registration,
          closed_event,
          close_date,
        });
      }

      if (existingPost.type === PostTypeEnum.PaidEvent) {
        Object.assign(updatedPostData, {
          organizer_bank_account_details,
        });
      }

      if (long && lat) {
        updatedPostData.location = { long: Number(long), lat: Number(lat) };
        updatedPostData.geo_location = { type: 'Point', coordinates: [Number(long), Number(lat)] };
      }

      const updatedPost = await this.dbService.updatePostById(postId, updatedPostData);
      updatedPost.participants = await this.getParticipants(updatedPost);
      updatedPost.reactions = updatedPost.reactions?.length ?? 0;
      updatedPost.sharesCount = updatedPost.shares?.length ?? 0;
      updatedPost.likesCount = updatedPost.likes?.length ?? 0;
      updatedPost.numberOfComments = updatedPost.comments?.length ?? 0;

      await this.kafkaService.createPostForRecommendationToKafka(updatedPost);

      if (reference_post_id) {
        await this.dbService.updatePostById(reference_post_id.toString(), {
          $push: { reference_post_ids: updatedPost.id },
        });
      }

      return {
        success: true,
        message: getMessage('POST_UPDATED'),
        post: updatedPost,
      };
    } catch (error) {
      throw new CustomError('Failed to update post', 500, error);
    }
  }

  async addProgressToPost(
    data: Partial<PostData>,
    postId: string,
    imageUrl?: string,
    videoUrl?: string,
  ): Promise<{ success: boolean; message: string; post: Post }> {
    try {
      validateMongoId(postId);
      const existingPost = await this.dbService.getPostById(postId);
      if (!existingPost) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);

      const schema = this.getPostSchema(existingPost.type);
      const validatedData = this.validatePostData(data, schema);

      const { description, current_amount } = validatedData;
      const descriptions = Array.isArray(description) ? description : [description];
      const updatedDescriptions = existingPost.description.concat(descriptions);
      const updatedMedia = imageUrl ? existingPost.media.concat([imageUrl]) : existingPost.media;

      const postData: Partial<Post> = {
        description: updatedDescriptions,
        media: updatedMedia,
      };

      if (existingPost.type === PostTypeEnum.Reels && videoUrl) {
        postData.video_url = existingPost.video_url?.concat([videoUrl]) || [videoUrl];
      }

      if (current_amount && existingPost.type === PostTypeEnum.Goal) {
        postData.current_amount = parseInt(current_amount.toString(), 10);
      }

      const updatedPost = await this.dbService.updatePostById(postId, postData);
      await this.kafkaService.createPostForRecommendationToKafka(updatedPost);

      const users = await this.getUsersWhoInteractedWithPost(postId, existingPost.user_id);
      await this.doNotificationFanOut(
        existingPost,
        'Post Progress added.',
        'added_progress_post',
        { ...updatedPost },
        users,
      );

      return {
        success: true,
        message: getMessage('PROGRESS_ADDED'),
        post: updatedPost,
      };
    } catch (error) {
      throw new CustomError('Failed to add progress to post', 500, error);
    }
  }

  async editProgressToPost(
    data: {
      delete_urls?: string;
      progress_index: number;
      description?: string;
      current_amount?: number;
    },
    postId: string,
  ): Promise<{ success: boolean; message: string; post: Post }> {
    try {
      validateMongoId(postId);
      const existingPost = await this.dbService.getPostById(postId);
      if (!existingPost) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);

      const { delete_urls, progress_index, description, current_amount } = data;

      let updatedDescription = existingPost.description;
      if (description && updatedDescription[progress_index]) {
        updatedDescription[progress_index] = description;
      }

      let updatedMedia = existingPost.media;
      let deletedUrls: string[] = [];
      if (delete_urls) {
        const deleteUrlArr = delete_urls.split(',').map(url => url.trim());
        if (updatedMedia[progress_index].length - deleteUrlArr.length < this.allowedDeletedPix) {
          throw new CustomError(
            getMessage('CANNOT_DELETE_MIN_PICTURES', this.allowedDeletedPix),
            400,
          );
        }

        const deleteUrlsSet = new Set(deleteUrlArr);
        updatedMedia[progress_index] = updatedMedia[progress_index].filter((url: string) => {
          if (deleteUrlsSet.has(url)) {
            deletedUrls.push(url);
            return false;
          }
          return true;
        });
      }

      const postData: Partial<Post> = {
        description: updatedDescription,
        media: updatedMedia,
      };

      if (current_amount && existingPost.type === PostTypeEnum.Goal) {
        postData.current_amount = parseInt(current_amount.toString(), 10);
      }

      const updatedPost = await this.dbService.updatePostById(postId, postData);
      if (delete_urls) await this.createOrUpdateDeleteImages(parseInt(postId), deletedUrls);

      await this.kafkaService.createPostForRecommendationToKafka(updatedPost);

      return {
        success: true,
        message: getMessage('PROGRESS_EDITED'),
        post: updatedPost,
      };
    } catch (error) {
      throw new CustomError('Failed to edit post progress', 500, error);
    }
  }

  async deletePost(
    postId: string,
    userId: number,
  ): Promise<{ success: boolean; deletedPost: Post; message: string }> {
    try {
      validateMongoId(postId);
      const postToDelete = await this.dbService.getPostById(postId);
      if (!postToDelete) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);

      await this.dbService.deleteCommentsByPostId(postId);
      await this.dbService.deleteLikesByPostId(postId);
      const deletedPost = await this.dbService.deletePostById(postId);

      return {
        success: true,
        deletedPost: postToDelete,
        message: getMessage('POST_DELETED'),
      };
    } catch (error) {
      throw new CustomError('Failed to delete post', 500, error);
    }
  }

  async createOrUpdateDeleteImages(postId: number, images: string[]): Promise<void> {
    try {
      const deletedImage = await this.dbService.findDeleteImage(postId);
      if (!deletedImage) {
        await this.dbService.insertDeleteImage({ postId, images });
        return;
      }
      const updateImages = [...deletedImage.images, ...images];
      await this.dbService.updateDeleteImage(postId, { images: updateImages });
    } catch (error) {
      throw new CustomError('Failed to update deleted images', 500, error);
    }
  }

  async tagUserToPost(
    req: { taggedUsers: UserTag[]; taggedBy: { user_id: number; name: string } },
    postId: string,
  ): Promise<{ success: boolean; message: string; post: Post }> {
    try {
      validateMongoId(postId);
      const { taggedUsers, taggedBy } = req;
      const post = await this.dbService.getPostById(postId);
      if (!post) throw new CustomError('Post Not Found', 404);

      const newlyTaggedUsers: UserTag[] = [];
      taggedUsers.forEach(tag => {
        const alreadyTagged = post.tags?.some(existingTag => existingTag.user_id === tag.user_id);
        if (!alreadyTagged) {
          post.tags = post.tags || [];
          post.tags.push({
            user_id: tag.user_id,
            name: tag.name,
            tagged_at: new Date(),
            tagged_by: taggedBy.user_id,
          });
          newlyTaggedUsers.push(tag);
        }
      });

      if (newlyTaggedUsers.length === 0) {
        return { success: true, message: 'No new users were tagged to the post', post };
      }

      const updatedPost = await this.dbService.updatePostById(postId, post);
      await this.kafkaService.createPostForRecommendationToKafka(updatedPost);

      await this.kafkaService.publishKafkaMessage({
        event: 'POST_TAG_NOTIFICATION',
        message: {
          users: newlyTaggedUsers,
          message: `${taggedBy.name} tagged you to a post`,
          post_data: updatedPost,
          topic: 'tag post',
        },
      });

      return {
        success: true,
        message: 'Successfully tagged user(s) to post',
        post: updatedPost,
      };
    } catch (error) {
      throw new CustomError('Failed to tag users to post', 500, error);
    }
  }

  async addUpdateAdditionalFieldToPost(
    postId: string,
    fields: AdditionalField[],
  ): Promise<{ success: boolean; post: Post }> {
    try {
      validateMongoId(postId);
      const post = await this.dbService.getPostById(postId);
      if (!post) throw new CustomError('Post not found', 404);

      post.additional_fields = post.additional_fields || [];
      post.additional_fields.push(...fields);

      const updatedPost = await this.dbService.updatePostById(postId, post);
      return { success: true, post: updatedPost };
    } catch (error) {
      throw new CustomError('Failed to add additional fields', 500, error);
    }
  }

  async removeAdditionalFieldsFromPost(
    postId: string,
    fieldIds: string[],
  ): Promise<{ success: boolean; post: Post }> {
    try {
      validateMongoId(postId);
      const post = await this.dbService.getPostById(postId);
      if (!post) throw new CustomError('Post not found', 404);

      post.additional_fields = post.additional_fields?.filter(
        field => !fieldIds.includes(field._id?.toString() || ''),
      ) || [];
      const updatedPost = await this.dbService.updatePostById(postId, post);
      return { success: true, post: updatedPost };
    } catch (error) {
      throw new CustomError('Failed to remove additional fields', 500, error);
    }
  }

  async editAdditionalFieldsInPost(
    postId: string,
    fieldsToUpdate: AdditionalField[],
  ): Promise<{ success: boolean; post: Post }> {
    try {
      validateMongoId(postId);
      const post = await this.dbService.getPostById(postId);
      if (!post) throw new CustomError('Post not found', 404);

      post.additional_fields = post.additional_fields?.map(field => {
        const updatedField = fieldsToUpdate.find(
          f => f._id?.toString() === field._id?.toString(),
        );
        return updatedField || field;
      }) || [];

      const updatedPost = await this.dbService.updatePostById(postId, post);
      return { success: true, post: updatedPost };
    } catch (error) {
      throw new CustomError('Failed to edit additional fields', 500, error);
    }
  }

  async getPostsByFollowedUsersGroups(
    userId: number,
  ): Promise<{ success: boolean; posts: Post[] }> {
    try {
      const posts = await this.dbService.getPostsByFollowedUsersGroups(userId);
      const formattedPosts = await this.formatPosts(posts, userId);
      return { success: true, posts: formattedPosts };
    } catch (error) {
      throw new CustomError('Failed to fetch posts by followed users', 500, error);
    }
  }

  async search(
    keyword: string,
    category: string,
    lowLimit: number,
    upperLimit: number,
    commentPage: number,
    commentPageSize: number,
  ): Promise<{ success: boolean; posts: Post[] }> {
    try {
      const posts = await this.dbService.searchPosts(
        keyword,
        category,
        lowLimit,
        upperLimit,
        commentPage,
        commentPageSize,
      );
      const formattedPosts = await this.formatPosts(posts, 0);
      return { success: true, posts: formattedPosts };
    } catch (error) {
      throw new CustomError('Failed to search posts', 500, error);
    }
  }

  async getAllReels(
    userId: number,
    low_limit: number,
    upper_limit: number,
    commentPage: number,
    commentPageSize: number,
  ): Promise<{ success: boolean; posts: Post[] }> {
    try {
      const posts = await this.dbService.getAllReels(userId, low_limit, upper_limit);
      const formattedPosts = await this.formatPosts(posts, userId, commentPage, commentPageSize);
      return { success: true, posts: formattedPosts };
    } catch (error) {
      throw new CustomError('Failed to fetch reels', 500, error);
    }
  }

  async sharePost(post_id: string, user_id: number): Promise<{ success: boolean; message: string; share: any }> {
    try {
      validateMongoId(post_id);
      const post = await this.dbService.getPostById(post_id);
      if (!post) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);

      const user = await userService.getUserById(user_id);
      if (!user) throw new CustomError(getMessage('USER_NOT_FOUND'), 404);

      const newShare = await this.dbService.insertShare({ user_id, post_id });
      await sendUpdatedPostToKafka(post_id, user_id);

      return { success: true, message: 'Post shared successfully', share: newShare };
    } catch (error) {
      throw new CustomError('Failed to share post', 500, error);
    }
  }

  async followPost(post_id: string, user_id: number): Promise<{ success: boolean; message: string }> {
    try {
      validateMongoId(post_id);
      const post = await this.dbService.getPostById(post_id);
      if (!post) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);

      const user = await userService.getUserById(user_id);
      if (!user) throw new CustomError(getMessage('USER_NOT_FOUND'), 404);

      const isFollowing = await this.dbService.findPostFollower(user_id, post_id);
      if (isFollowing) {
        throw new CustomError('User is already following the post', 400);
      }

      const followPost = await this.dbService.insertPostFollower({ user_id, post_id });
      await this.kafkaService.publishKafkaMessage({
        event: 'WEB_SOCKET, PUSH_NOTIFICATION',
        message: JSON.stringify({
          user_id: followPost.userId,
          action_userId: user_id,
          message: 'Post followed.',
          topic: 'follow_post',
          data: { followPost, action_user: user },
        }),
      });

      return { success: true, message: 'Post followed successfully' };
    } catch (error) {
      throw new CustomError('Failed to follow post', 500, error);
    }
  }

  async unfollowPost(post_id: string, user_id: number): Promise<{ success: boolean; message: string }> {
    try {
      validateMongoId(post_id);
      const post = await this.dbService.getPostById(post_id);
      if (!post) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);

      const hasFollowed = post.followers?.includes(user_id);
      if (!hasFollowed) throw new CustomError('User is not following this post', 400);

      await this.dbService.removeFollower(post_id, user_id);
      return { success: true, message: 'Post unfollowed successfully' };
    } catch (error) {
      throw new CustomError('Failed to unfollow post', 500, error);
    }
  }

  private async formatPosts(
    posts: Post[],
    userId: number,
    commentPage: number = 0,
    commentPageSize: number = 10,
  ): Promise<Post[]> {
    const formattedPosts = await Promise.all(
      posts.map(async post => {
        const formattedPost = await formatPostData(post, userId, commentPage, commentPageSize);
        formattedPost.participants = await this.getParticipants(formattedPost);
        return formattedPost;
      }),
    );
    return formattedPosts.filter((post): post is Post => post !== null);
  }

  private async getParticipants(
    post: Post,
    numberOfParticipants: number = 4,
  ): Promise<Array<{ id: number }>> {
    return (post.participants?.slice(0, numberOfParticipants) || []) as Array<{ id: number }>;
  }

  private async getParticipantIds(post: Post): Promise<number[]> {
    return post.participants?.map(p => p.id || p._id) || [];
  }

  private async getUsersWhoInteractedWithPost(postId: string, userId: number): Promise<number[]> {
    const interactions = await this.dbService.getPostInteractions(postId);
    return interactions.map(interaction => interaction.user_id).filter(id => id !== userId);
  }

  private async sendEventIsLiveToKafka(user_id: number, post: Post): Promise<void> {
    await this.kafkaService.publishKafkaMessage({
      event: 'EVENT_LIVE',
      message: JSON.stringify({ user_id, post, topic: 'event_live' }),
    });
  }

  private async getTop10SocialIds(): Promise<number[]> {
    return await this.dbService.getTopSocialIds(10);
  }

  private async getTopConnections(userId: number): Promise<number[]> {
    return await this.dbService.getUserConnections(
      userId,
      parseInt(process.env.DEFAULT_CONNECTION_OFFSET || '0'),
      parseInt(process.env.DEFAULT_CONNECTION_SIZE || '1000'),
    );
  }

  private async doNotificationFanOut(
    post: Post,
    message: string,
    topic: string,
    data: any,
    users: number[],
  ): Promise<void> {
    await this.kafkaService.publishKafkaMessage({
      event: 'NOTIFICATION_FAN_OUT',
      message: JSON.stringify({ post, message, topic, data, users }),
    });
  }
}
```