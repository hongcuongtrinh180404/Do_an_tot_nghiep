import { Model, ClientSession } from 'mongoose';
import { IInstructorTerm } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { InstructorTermDocument } from '../schemas/instructor-term.schema.js';
import { TermItemDto } from '../dto/update-instructor-terms.dto.js';
export declare class InstructorTermRepository extends BaseMongoRepository<IInstructorTerm, InstructorTermDocument, string> {
    constructor(termModel: Model<InstructorTermDocument>);
    findAllOrdered(session?: ClientSession): Promise<IInstructorTerm[]>;
    replaceAllTerms(termDtos: TermItemDto[], session?: ClientSession): Promise<IInstructorTerm[]>;
}
