import { emojiCatalog, filterEmojiCatalog } from '@/lib/data/emoji-catalog';
it('contains the full offline catalog, all groups and unique identities',()=>{
 expect(emojiCatalog.length).toBeGreaterThan(3900);
 expect(new Set(emojiCatalog.map(e=>e.id)).size).toBe(emojiCatalog.length);
 expect(new Set(emojiCatalog.map(e=>e.group)).size).toBe(10);
 expect(filterEmojiCatalog('',9).some(e=>e.emoji==='🇮🇳')).toBe(true);
});
it('searches names, keywords, Hindi and common Hinglish aliases',()=>{
 expect(filterEmojiCatalog('pizza').some(e=>e.emoji==='🍕')).toBe(true);
 expect(filterEmojiCatalog('red heart').some(e=>e.emoji==='❤️')).toBe(true);
 expect(filterEmojiCatalog('dil').some(e=>e.emoji==='❤️')).toBe(true);
 expect(filterEmojiCatalog('हाथ').length).toBeGreaterThan(0);
 expect(filterEmojiCatalog('no-matching-emoji-xyz')).toHaveLength(0);
});
it('makes skin-tone variants available without crowding the default view',()=>{
 expect(filterEmojiCatalog('thumbs up').some(e=>e.id==='1F44D')).toBe(true);
 expect(filterEmojiCatalog('thumbs up',-2,5).some(e=>e.emoji==='👍🏿')).toBe(true);
 expect(filterEmojiCatalog('',-2,'all')).toHaveLength(emojiCatalog.length);
});
it('keeps recently selected variants in the correct order',()=>{
 const ids=[emojiCatalog.find(e=>e.emoji==='👍🏿')!.id,emojiCatalog.find(e=>e.emoji==='❤️')!.id];
 expect(filterEmojiCatalog('',-1,'default',ids).map(e=>e.id)).toEqual(ids);
});
