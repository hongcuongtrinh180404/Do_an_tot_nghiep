var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionEntity, SessionSchema } from './schemas/session.schema.js';
import { SessionRepository } from './repositories/session.repository.js';
import { SessionService } from './services/session.service.js';
let SessionModule = class SessionModule {
};
SessionModule = __decorate([
    Module({
        imports: [
            MongooseModule.forFeature([
                { name: SessionEntity.name, schema: SessionSchema },
            ]),
        ],
        providers: [SessionRepository, SessionService],
        exports: [SessionRepository, SessionService],
    })
], SessionModule);
export { SessionModule };
//# sourceMappingURL=session.module.js.map