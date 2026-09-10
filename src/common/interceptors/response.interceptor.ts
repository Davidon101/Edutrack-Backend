import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: Record<string, any>;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((response) => {
        // If the controller already returns a shaped response, pass through
        if (response && response.success !== undefined) {
          return response;
        }

        // Otherwise wrap in standard envelope
        const { data, message, meta, ...rest } = response || {};

        return {
          success: true,
          data: data !== undefined ? data : response,
          ...(message && { message }),
          ...(meta && { meta }),
        };
      }),
    );
  }
}
