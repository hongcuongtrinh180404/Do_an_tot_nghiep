var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { GeminiKeyManager } from './gemini-key.manager.js';
import { RiverKeyManager } from './river-key.manager.js';
import { GeminiService } from './gemini.service.js';
let GeminiModule = class GeminiModule {
};
GeminiModule = __decorate([
    Module({
        providers: [GeminiKeyManager, RiverKeyManager, GeminiService],
        exports: [GeminiKeyManager, RiverKeyManager, GeminiService],
    })
], GeminiModule);
export { GeminiModule };
//# sourceMappingURL=gemini.module.js.map