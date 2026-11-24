import { signed, splitIngredients } from './format'

test('signed shows a real minus and one decimal', () => {
  expect(signed(1.26)).toBe('+1.3')
  expect(signed(-0.5)).toBe('−0.5')
  expect(signed(0)).toBe('0.0')
  expect(signed(null)).toBe('–')
})

test('ingredients split on commas, semicolons and new lines', () => {
  expect(splitIngredients('vanilla, rose ;\n bergamot,, ')).toEqual(['vanilla', 'rose', 'bergamot'])
})
