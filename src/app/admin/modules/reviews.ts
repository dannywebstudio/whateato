export type {Review} from './types';
export const reviewScoreLabel=(value:number|null)=>value===null?'N/A':value+'/5';
