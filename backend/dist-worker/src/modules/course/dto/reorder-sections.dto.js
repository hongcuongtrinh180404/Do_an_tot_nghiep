var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsArray, ArrayMinSize, IsMongoId } from 'class-validator';
export class ReorderSectionsDto {
    sectionIds;
}
__decorate([
    IsArray({ message: 'Danh sách ID chương học phải là một mảng' }),
    ArrayMinSize(1, { message: 'Danh sách ID chương học không được để trống' }),
    IsMongoId({ each: true, message: 'Mỗi ID chương học phải là ObjectId hợp lệ' }),
    __metadata("design:type", Array)
], ReorderSectionsDto.prototype, "sectionIds", void 0);
//# sourceMappingURL=reorder-sections.dto.js.map