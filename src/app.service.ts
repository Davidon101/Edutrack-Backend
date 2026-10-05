import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getWelcome() {
    return {
      name: 'EduTrack AI API',
      status: 'ok',
      docs: '/api/docs',
      baseUrl: '/api/v1',
    };
  }
}