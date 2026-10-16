export type Role='owner'|'editor'|'moderator';
export type Tab='restaurants'|'batches'|'reviews'|'blog';
export type Place={id:string;name_ko:string;region_sigungu:string|null;road_address_ko:string|null;publication_status:string};
export type Detail={
 restaurant:Place&{lot_address_ko:string|null;category_code:string|null;
  region_sido:string|null;region_dong:string|null;latitude:number|null;longitude:number|null;
  cms_origin:boolean;cms_source_url:string|null;business_status:string;public_approved:boolean};
 locales:{locale:string;display_name:string;short_description:string|null;full_description:string|null;source_notes:string|null}[];
 menus:{id:string;menu_key:string;position:number;price_krw:number|null;locale:string|null;name:string|null;description:string|null;publication_state:string}[];
 tags:{tag_code:string;verification_state:string;evidence_ref:string|null}[];
 hours:{weekday:number|null;start_minute:number|null;end_minute:number|null;source_url:string;publication_state:string}[];
 images:{id:string;position:number;publication_state:string;rights_status:string;cms_photo_role:'cover'|'gallery';url:string}[];
};
export type Batch={id:string;title:string;state:string;total:number;applied:number;failed:number};
export type Review={id:string;restaurant_id:string;restaurant_name:string;rating:number;body:string;created_at:string;
  categories:Record<string,number|null>|null;photos:{id:string;url:string;status:string}[]};
export type Day={weekday:number;closed:boolean;open:string;close:string;breakStart:string;breakEnd:string};

export type Menu=ReturnType<typeof import('./restaurants').blankMenu>;
export type Item={source_key:string;restaurant_id:string;kind:string;payload:Record<string,unknown>};
