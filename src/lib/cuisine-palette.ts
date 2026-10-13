/** Single category palette shared by restaurant cards and map markers. */
export const cuisinePalette={
 korean:{color:'#16845b',label:'한식'},
 seafood:{color:'#2873c8',label:'횟집·해산물'},
 japanese:{color:'#c94751',label:'일식'},
 chinese:{color:'#222a32',label:'중식'},
 cafe:{color:'#a16bce',label:'카페'},
 western:{color:'#d18b35',label:'양식'},
 chicken:{color:'#b87b38',label:'치킨'},
 snack:{color:'#dd6790',label:'분식'},
 other:{color:'#697887',label:'기타'}
} as const;
export type CuisineKey=keyof typeof cuisinePalette;
export function cuisineKey(category:string|null|undefined):CuisineKey{
 const value=(category||'').replace(/\s+/g,'').toLowerCase();
 if(/횟|회집|일식.*회|해산물|수산|조개|생선회/.test(value))return 'seafood';
 if(/한식|한정식|한식뷔페|냉면|국밥|육류구이|탕류/.test(value))return 'korean';
 if(/일식|초밥|스시|라멘|우동|돈까스|일본/.test(value))return 'japanese';
 if(/중식|중국|짜장|마라|훠궈/.test(value))return 'chinese';
 if(/카페|까페|커피|다방|디저트|제과|휴게음식/.test(value))return 'cafe';
 if(/경양식|양식|패밀리레스토랑|피자|파스타|스테이크/.test(value))return 'western';
 if(/치킨|통닭/.test(value))return 'chicken';
 if(/분식|김밥|떡볶이/.test(value))return 'snack';
 return 'other';
}
export function cuisineColor(category:string|null|undefined):string{
 return cuisinePalette[cuisineKey(category)].color;
}
