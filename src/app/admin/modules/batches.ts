export type {Batch,Item} from './types';
export const parseBatchLines=(content:string):unknown[]=>content.split(/\r?\n/).filter(line=>line.trim()).map(line=>JSON.parse(line));
