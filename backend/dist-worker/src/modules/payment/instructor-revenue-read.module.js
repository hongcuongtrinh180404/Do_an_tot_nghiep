var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderEntity, OrderSchema } from '../enrollment/schemas/order.schema.js';
import { InstructorRevenueReadRepository } from './repositories/instructor-revenue-read.repository.js';
let InstructorRevenueReadModule = class InstructorRevenueReadModule {
};
InstructorRevenueReadModule = __decorate([
    Module({
        imports: [MongooseModule.forFeature([{ name: OrderEntity.name, schema: OrderSchema }])],
        providers: [InstructorRevenueReadRepository],
        exports: [InstructorRevenueReadRepository],
    })
], InstructorRevenueReadModule);
export { InstructorRevenueReadModule };
//# sourceMappingURL=instructor-revenue-read.module.js.map