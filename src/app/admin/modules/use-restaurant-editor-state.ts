'use client';
import {useState} from 'react';
import type {Place,Detail,Menu,Day} from './types';
import {locales,blankMenu,emptyDays} from './restaurants';
/** Restaurant editor form state, isolated from review and batch tabs. */
export function useRestaurantEditorState(){
 const [q,setQ]=useState('');const [matches,setMatches]=useState<Place[]>([]);
 const [cursor,setCursor]=useState<string|null>(null);
 const [selected,setSelected]=useState<Detail|null>(null);
 const [publicEvidence,setPublicEvidence]=useState('');
 const [locale,setLocale]=useState<typeof locales[number]>('en');
 const [displayName,setDisplayName]=useState('');const [intro,setIntro]=useState('');
 const [full,setFull]=useState('');const [source,setSource]=useState('');
 const [menus,setMenus]=useState<Menu[]>([blankMenu()]);
 const [chosenTags,setChosenTags]=useState<string[]>([]);
 const [tagEvidence,setTagEvidence]=useState('');
 const [days,setDays]=useState<Day[]>(emptyDays());
 const [hoursEvidence,setHoursEvidence]=useState('');
 const [image,setImage]=useState<File|null>(null);const [rights,setRights]=useState(false);
 const [photoRole,setPhotoRole]=useState<'cover'|'gallery'>('cover');
 const [creating,setCreating]=useState(false);
 const [newVenue,setNewVenue]=useState({name_ko:'',road_address_ko:'',lot_address_ko:'',
   region_sido:'',region_sigungu:'',region_dong:'',latitude:'',longitude:'',source_url:''});
 const [address,setAddress]=useState({road_address_ko:'',lot_address_ko:'',
   region_sido:'',region_sigungu:'',region_dong:'',latitude:'',longitude:''});
 const [addressProof,setAddressProof]=useState('');
 const [publishNew,setPublishNew]=useState(false);
 const [imageEvidence,setImageEvidence]=useState('');const [rightsEvidence,setRightsEvidence]=useState('');const [imagePosition,setImagePosition]=useState(0);
 const [imageResult,setImageResult]=useState('');

 return {q,setQ,matches,setMatches,cursor,setCursor,selected,setSelected,publicEvidence,setPublicEvidence,locale,setLocale,displayName,setDisplayName,intro,setIntro,full,setFull,source,setSource,menus,setMenus,chosenTags,setChosenTags,tagEvidence,setTagEvidence,days,setDays,hoursEvidence,setHoursEvidence,image,setImage,rights,setRights,photoRole,setPhotoRole,creating,setCreating,newVenue,setNewVenue,address,setAddress,addressProof,setAddressProof,publishNew,setPublishNew,imageEvidence,setImageEvidence,rightsEvidence,setRightsEvidence,imagePosition,setImagePosition,imageResult,setImageResult};
}
