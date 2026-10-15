import { Module } from '@nestjs/common';
import { SessionManagerService } from './session-manager.service';
import { LinkedInSessionService } from './linkedin-session.service';

@Module({
  providers: [SessionManagerService, LinkedInSessionService],
  exports: [SessionManagerService, LinkedInSessionService],
})
export class SessionModule {}
