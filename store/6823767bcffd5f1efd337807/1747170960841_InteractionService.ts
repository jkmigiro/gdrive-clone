import { DBService } from './DBService';
import { KafkaService } from './KafkaService';
import { CustomError } from '../errors/CustomError';
import { UserService } from './UserService';
import { Post, Comment } from '../models/Post';
import { getMessage } from '../util/message';
import { v4 as uuidv4 } from 'uuid';

interface CommentData {
  user_id: number;
  comment: string;
  post_id: string;
  parent_comment_id?: string;
}

export class InteractionService {
  private dbService: DBService;
  private kafkaService: KafkaService;
  private userService: UserService;

  constructor(dbService: DBService, kafkaService: KafkaService, userService: UserService) {
    this.dbService = dbService;
    this.kafkaService = kafkaService;
    this.userService = userService;
  }

  async likePost(postId: string, userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const post = await this.dbService.getPostById(postId);
      if (!post) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);

      const user = await this.userService.getUserById(userId);
      if (!user) throw new CustomError(getMessage('USER_NOT_FOUND'), 404);

      const alreadyLiked = post.likes?.includes(userId);
      if (alreadyLiked) throw new CustomError('User already liked this post', 400);

      await this.dbService.addLike(postId, userId);
      await this.kafkaService.publishKafkaMessage({
        event: 'POST_LIKE',
        message: JSON.stringify({
          user_id: userId,
          post_id: postId,
          message: `${user.first_name || user.org_name} liked your post`,
          topic: 'post_like',
          data: { post, action_user: user },
        }),
      });

      return { success: true, message: 'Post liked successfully' };
    } catch (error) {
      throw error;
    }
  }

  async unlikePost(postId: string, userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const post = await this.dbService.getPostById(postId);
      if (!post) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);

      const user = await this.userService.getUserById(userId);
      if (!user) throw new CustomError(getMessage('USER_NOT_FOUND'), 404);

      const hasLiked = post.likes?.includes(userId);
      if (!hasLiked) throw new CustomError('User has not liked this post', 400);

      await this.dbService.removeLike(postId, userId);
      return { success: true, message: 'Post unliked successfully' };
    } catch (error) {
      throw error;
    }
  }

  async addComment(data: CommentData): Promise<{ success: boolean; comment: Comment; message: string }> {
    try {
      const { user_id, comment, post_id, parent_comment_id } = data;
      const post = await this.dbService.getPostById(post_id);
      if (!post) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);

      const user = await this.userService.getUserById(user_id);
      if (!user) throw new CustomError(getMessage('USER_NOT_FOUND'), 404);

      const newComment: Comment = {
        id: uuidv4(),
        user_id,
        post_id,
        comment,
        created_at: new Date(),
        parent_comment_id,
      };

      const createdComment = await this.dbService.addComment(newComment);
      await this.kafkaService.publishKafkaMessage({
        event: 'POST_COMMENT',
        message: JSON.stringify({
          user_id,
          post_id,
          comment_id: createdComment.id,
          message: `${user.first_name || user.org_name} commented on your post`,
          topic: 'post_comment',
          data: { post, comment: createdComment, action_user: user },
        }),
      });

      return { success: true, comment: createdComment, message: 'Comment added successfully' };
    } catch (error) {
      throw error;
    }
  }

  async editComment(commentId: string, userId: number, commentText: string): Promise<{ success: boolean; comment: Comment; message: string }> {
    try {
      const comment = await this.dbService.getCommentById(commentId);
      if (!comment) throw new CustomError('Comment not found', 404);
      if (comment.user_id !== userId) throw new CustomError('User not authorized to edit this comment', 403);

      const updatedComment = await this.dbService.updateComment(commentId, { comment: commentText });
      return { success: true, comment: updatedComment, message: 'Comment updated successfully' };
    } catch (error) {
      throw error;
    }
  }

  async deleteComment(commentId: string, userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const comment = await this.dbService.getCommentById(commentId);
      if (!comment) throw new CustomError('Comment not found', 404);
      if (comment.user_id !== userId) throw new CustomError('User not authorized to delete this comment', 403);

      await this.dbService.deleteComment(commentId);
      return { success: true, message: 'Comment deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  async likeComment(commentId: string, userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const comment = await this.dbService.getCommentById(commentId);
      if (!comment) throw new CustomError('Comment not found', 404);

      const user = await this.userService.getUserById(userId);
      if (!user) throw new CustomError(getMessage('USER_NOT_FOUND'), 404);

      const alreadyLiked = comment.likes?.includes(userId);
      if (alreadyLiked) throw new CustomError('User already liked this comment', 400);

      await this.dbService.addCommentLike(commentId, userId);
      await this.kafkaService.publishKafkaMessage({
        event: 'COMMENT_LIKE',
        message: JSON.stringify({
          user_id: userId,
          comment_id: commentId,
          message: `${user.first_name || user.org_name} liked your comment`,
          topic: 'comment_like',
          data: { comment, action_user: user },
        }),
      });

      return { success: true, message: 'Comment liked successfully' };
    } catch (error) {
      throw error;
    }
  }

  async unlikeComment(commentId: string, userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const comment = await this.dbService.getCommentById(commentId);
      if (!comment) throw new CustomError('Comment not found', 404);

      const hasLiked = comment.likes?.includes(userId);
      if (!hasLiked) throw new CustomError('User has not liked this comment', 400);

      await this.dbService.removeCommentLike(commentId, userId);
      return { success: true, message: 'Comment unliked successfully' };
    } catch (error) {
      throw error;
    }
  }

  async sharePost(postId: string, userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const post = await this.dbService.getPostById(postId);
      if (!post) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);

      const user = await this.userService.getUserById(userId);
      if (!user) throw new CustomError(getMessage('USER_NOT_FOUND'), 404);

      await this.dbService.addShare(postId, userId);
      await this.kafkaService.publishKafkaMessage({
        event: 'POST_SHARE',
        message: JSON.stringify({
          user_id: userId,
          post_id: postId,
          message: `${user.first_name || user.org_name} shared your post`,
          topic: 'post_share',
          data: { post, action_user: user },
        }),
      });

      return { success: true, message: 'Post shared successfully' };
    } catch (error) {
      throw error;
    }
  }

  async followPost(postId: string, userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const post = await this.dbService.getPostById(postId);
      if (!post) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);

      const user = await this.userService.getUserById(userId);
      if (!user) throw new CustomError(getMessage('USER_NOT_FOUND'), 404);

      const alreadyFollowing = post.followers?.includes(userId);
      if (alreadyFollowing) throw new CustomError('User already following this post', 400);

      await this.dbService.addFollower(postId, userId);
      await this.kafkaService.publishKafkaMessage({
        event: 'POST_FOLLOW',
        message: JSON.stringify({
          user_id: userId,
          post_id: postId,
          message: `${user.first_name || user.org_name} followed your post`,
          topic: 'post_follow',
          data: { post, action_user: user },
        }),
      });

      return { success: true, message: 'Post followed successfully' };
    } catch (error) {
      throw error;
    }
  }

  async unfollowPost(postId: string, userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const post = await this.dbService.getPostById(postId);
      if (!post) throw new CustomError(getMessage('NO_POSTS_FOUND'), 404);

      const hasFollowed = post.followers?.includes(userId);
      if (!hasFollowed) throw new CustomError('User is not following this post', 400);

      await this.dbService.removeFollower(postId, userId);
      return { success: true, message: 'Post unfollowed successfully' };
    } catch (error) {
      throw error;
    }
  }

  async likeCommentKeyAttendee(keyAttendeeId: string, userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const keyAttendee = await this.dbService.getKeyAttendee(keyAttendeeId);
      if (!keyAttendee) throw new CustomError('Key attendee not found', 404);

      const user = await this.userService.getUserById(userId);
      if (!user) throw new CustomError(getMessage('USER_NOT_FOUND'), 404);

      const alreadyLiked = keyAttendee.likes?.includes(userId);
      if (alreadyLiked) throw new CustomError('User already liked this key attendee', 400);

      await this.dbService.addKeyAttendeeLike(keyAttendeeId, userId);
      await this.kafkaService.publishKafkaMessage({
        event: 'KEY_ATTENDEE_LIKE',
        message: JSON.stringify({
          user_id: userId,
          key_attendee_id: keyAttendeeId,
          message: `${user.first_name || user.org_name} liked your key attendee profile`,
          topic: 'key_attendee_like',
          data: { keyAttendee, action_user: user },
        }),
      });

      return { success: true, message: 'Key attendee liked successfully' };
    } catch (error) {
      throw error;
    }
  }

  async unlikeCommentKeyAttendee(keyAttendeeId: string, userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const keyAttendee = await this.dbService.getKeyAttendee(keyAttendeeId);
      if (!keyAttendee) throw new CustomError('Key attendee not found', 404);

      const hasLiked = keyAttendee.likes?.includes(userId);
      if (!hasLiked) throw new CustomError('User has not liked this key attendee', 400);

      await this.dbService.removeKeyAttendeeLike(keyAttendeeId, userId);
      return { success: true, message: 'Key attendee unliked successfully' };
    } catch (error) {
      throw error;
    }
  }

  async likeCommentFiresideAgenda(firesideAgendaId: string, userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const firesideAgenda = await this.dbService.getFiresideById(firesideAgendaId);
      if (!firesideAgenda) throw new CustomError('Fireside agenda not found', 404);

      const user = await this.userService.getUserById(userId);
      if (!user) throw new CustomError(getMessage('USER_NOT_FOUND'), 404);

      const alreadyLiked = firesideAgenda.likes?.includes(userId);
      if (alreadyLiked) throw new CustomError('User already liked this fireside agenda', 400);

      await this.dbService.addFiresideAgendaLike(firesideAgendaId, userId);
      await this.kafkaService.publishKafkaMessage({
        event: 'FIRESIDE_AGENDA_LIKE',
        message: JSON.stringify({
          user_id: userId,
          fireside_agenda_id: firesideAgendaId,
          message: `${user.first_name || user.org_name} liked your fireside agenda`,
          topic: 'fireside_agenda_like',
          data: { firesideAgenda, action_user: user },
        }),
      });

      return { success: true, message: 'Fireside agenda liked successfully' };
    } catch (error) {
      throw error;
    }
  }

  async unlikeCommentFiresideAgenda(firesideAgendaId: string, userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const firesideAgenda = await this.dbService.getFiresideById(firesideAgendaId);
      if (!firesideAgenda) throw new CustomError('Fireside agenda not found', 404);

      const hasLiked = firesideAgenda.likes?.includes(userId);
      if (!hasLiked) throw new CustomError('User has not liked this fireside agenda', 400);

      await this.dbService.removeFiresideAgendaLike(firesideAgendaId, userId);
      return { success: true, message: 'Fireside agenda unliked successfully' };
    } catch (error) {
      throw error;
    }
  }

  async deleteCommentKeyAttendee(commentId: string, userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const comment = await this.dbService.getKeyAttendeeCommentById(commentId);
      if (!comment) throw new CustomError('Comment not found', 404);
      if (comment.user_id !== userId) throw new CustomError('User not authorized to delete this comment', 403);

      await this.dbService.deleteKeyAttendeeComment(commentId);
      return { success: true, message: 'Key attendee comment deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  async deleteCommentFiresideAgenda(commentId: string, userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const comment = await this.dbService.getFiresideAgendaCommentById(commentId);
      if (!comment) throw new CustomError('Comment not found', 404);
      if (comment.user_id !== userId) throw new CustomError('User not authorized to delete this comment', 403);

      await this.dbService.deleteFiresideAgendaComment(commentId);
      return { success: true, message: 'Fireside agenda comment deleted successfully' };
    } catch (error) {
      throw error;
    }
  }
}