export const ROOM_ICONS = ['lantern', 'house', 'mountain', 'moon', 'autumn', 'snowflake', 'gift', 'torii']
export const TEA_ICONS = ['cup', 'teapot', 'mug', 'boba', 'gaiwan', 'matcha', 'iced', 'flask']
export const PERSON_ICONS = [
  'fox', 'cat', 'dog', 'bear', 'panda', 'rabbit', 'owl', 'frog', 'penguin', 'mouse', 'koala', 'chick',
]

export type TeaColor = { key: string; name: string; teas: string; hex: string; dark: boolean }

export const TEA_COLORS: TeaColor[] = [
  { key: 'pale', name: 'Pale straw', teas: 'white tea (Silver Needle, White Peony)', hex: '#ece0ae', dark: false },
  { key: 'gold', name: 'Light gold', teas: 'Chinese green tea, yellow tea (Long Jing)', hex: '#e2c55c', dark: false },
  { key: 'jade', name: 'Jade green', teas: 'Japanese green tea (sencha, gyokuro, matcha)', hex: '#a8bd58', dark: false },
  { key: 'golden', name: 'Golden', teas: 'light oolong, jasmine tea (Tie Guan Yin)', hex: '#d9a531', dark: false },
  { key: 'amber', name: 'Amber', teas: 'dark oolong, Darjeeling, light black tea', hex: '#c87a24', dark: false },
  { key: 'copper', name: 'Copper', teas: 'black tea (Assam, Earl Grey, Ceylon, English Breakfast)', hex: '#a2481d', dark: true },
  { key: 'ruby', name: 'Ruby red', teas: 'herbal tea (rooibos, hibiscus, fruit tea)', hex: '#8c2a22', dark: true },
  { key: 'dark', name: 'Dark brown', teas: 'strong black tea, pu-erh, roasted tea (hojicha)', hex: '#4a2717', dark: true },
]

export function teaColor(key: string | null): TeaColor | undefined {
  return TEA_COLORS.find((c) => c.key === key)
}
