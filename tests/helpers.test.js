const Helpers = require('./../components/helpers')

const multiply_arrays = (a, b, callback) => {
  const res = []
  for (let av of a) for (let bv of b) res.push(callback(av, bv))
  return res
}

const build_field_with_table = (av, bv) => {
  return `${av}.${bv}`;
}

const correct_names = [
  'name',
  'NAME',
  'NaMe',
  'Name_1',
  '123name',
  '_name',
  'name_',
]

const incorrect_names = [
  '',
  '`name`',
  '"name"',
  'na\nme',
  '\'name\'',
  'na me',
  ' name',
  'ИМЯ',
  'na?me',
  'name' + String.fromCharCode(30),
]

test.each(correct_names)('table-name-correct', (t_name) => {
  expect(Helpers.tableName(t_name)).toBe(t_name)
})

test.each(incorrect_names.concat(['name.name']))('table-name-incorrect', (t_name) => {
  expect(() => Helpers.tableName(t_name)).toThrow()
})

test.each(
  correct_names
    .concat(multiply_arrays(correct_names, correct_names, build_field_with_table))
)('field-name-correct', (t_name) => {
  expect(Helpers.fieldName(t_name)).toBe(t_name)
})

test.each(
  incorrect_names
    .concat(multiply_arrays(incorrect_names, correct_names, build_field_with_table))
    .concat(multiply_arrays(correct_names, incorrect_names, build_field_with_table))
    .concat(multiply_arrays(incorrect_names, incorrect_names, build_field_with_table))
    .concat([
      'table.field.whatever',
    ])
)('field-name-incorrect', (t_name) => {
  expect(() => Helpers.fieldName(t_name)).toThrow()
})
