var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
let ParseObjectIdPipe = class ParseObjectIdPipe {
    transform(value) {
        if (!Types.ObjectId.isValid(value)) {
            throw new BadRequestException(`ID '${value}' không phải là MongoDB ObjectId hợp lệ`);
        }
        return value;
    }
};
ParseObjectIdPipe = __decorate([
    Injectable()
], ParseObjectIdPipe);
export { ParseObjectIdPipe };
//# sourceMappingURL=parse-object-id.pipe.js.map