import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { IUserProfile } from 'share-lib';

interface RequestWithUser extends Request {
  user?: IUserProfile;
}

export const CurrentUser = createParamDecorator(
  (data: keyof IUserProfile | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
