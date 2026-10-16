'use client';
import {useState} from 'react';
import type {Batch,Review} from './types';
import {ownerApi} from './owner-api';

/** CMS read-only queue state; action permissions remain enforced server-side. */
export function useCmsQueues(
 reviewStatus:'pending'|'published'|'rejected',
 setBatchId:(id:string)=>void,
 onError:(error:unknown)=>void
){
 const [batches,setBatches]=useState<Batch[]>([]);
 const [currentBatch,setCurrentBatch]=useState<any>(null);
 const [reviews,setReviews]=useState<Review[]>([]);
 const loadBatches=async()=>{
  try{const response=await ownerApi.listBatches();setBatches(response.items)}
  catch(error){onError(error)}
 };
 const loadBatch=async(id:string)=>{
  try{const response=await ownerApi.getBatch(id);setCurrentBatch(response);setBatchId(id)}
  catch(error){onError(error)}
 };
 const loadReviews=async()=>{
  try{const response=await ownerApi.listReviews(reviewStatus);setReviews(response.items)}
  catch(error){onError(error)}
 };
 return {batches,currentBatch,reviews,loadBatches,loadBatch,loadReviews};
}
