import '!./ui.css'

import {
  Container,
  Divider,
  Bold,
  render,
  Text,
  Muted,
  VerticalSpace,
  SearchTextbox,
  DropdownOption,
  Dropdown,
  Columns,
  Checkbox,
  Link,
  IconFolder16,
  IconPen16,
} from "@create-figma-plugin/ui";
import {
	emit,
} from '@create-figma-plugin/utilities'

import { h, JSX } from 'preact'
import { useState } from 'preact/hooks'
import { version, icons } from './icons.json'
import useSearch from './use-search'
import { buildSvg } from './svg'

type Icon = {
	name: string,
	body: string,
	category: string,
	tags: string[]
}

function IconButton({
  icon,
  stroke,
  outlineStroke,
}: {
  icon: Icon;
  stroke: string;
  outlineStroke: boolean;
}) {
  const svg = buildSvg(icon.body, stroke);

  const handleClick = (name: string, svg: string) => {
    emit("SUBMIT", {
      name,
      svg,
      outlineStroke,
    });
  };

  return (
    <button
      aria-label={icon.name}
      onClick={() => handleClick(icon.name, svg)}
      class="icon-button"
      dangerouslySetInnerHTML={{ __html: svg }}
    ></button>
  );
}

const categories: Array<DropdownOption> = [
	{ value: '', text: 'All categories' },
	...Array.from(new Set(icons.map((icon) => icon.category)))
		.filter((category) => category !== '')
		.sort()
		.map((category) => ({ value: category, text: category })),
]

const strokes: Array<DropdownOption> = [
	{ value: '1', text: 'Thin' },
	{ value: '1.5', text: 'Light' },
	{ value: '2', text: 'Normal' },
]

const limit = 102

function Plugin() {
	const [search, setSearch] = useState<string>('')
	const [category, setCategory] = useState<string>('')
	const [stroke, setStroke] = useState<string>('2')
	const [outlineStroke, setOutlineStroke] = useState<boolean>(false);

	const results = useSearch(search, category)

	function handleInput(event: JSX.TargetedEvent<HTMLInputElement>) {
		setSearch(event.currentTarget.value)
	}

	function handleCategoryChange(event: JSX.TargetedEvent<HTMLInputElement>) {
		setCategory(event.currentTarget.value)
	}

	function handleStrokeChange(event: JSX.TargetedEvent<HTMLInputElement>) {
		setStroke(event.currentTarget.value)
	}

	function handleOutlineChange(event: JSX.TargetedEvent<HTMLInputElement>) {
    setOutlineStroke(event.currentTarget.checked);
  }

	return (
    <div>
      <div class="search">
        <Container space="extraSmall">
          <VerticalSpace space="extraSmall" />
          <Columns space="small">
            <Dropdown
              icon={<IconFolder16 />}
              onChange={handleCategoryChange}
              options={categories}
              value={category}
            />
            <Dropdown
              icon={<IconPen16 />}
              onChange={handleStrokeChange}
              options={strokes}
              value={stroke}
            />
          </Columns>
        </Container>
        <VerticalSpace space="extraSmall" />
        <Container space="extraSmall">
          <SearchTextbox
            onInput={handleInput}
            placeholder={`Search ${icons.length} icons`}
            value={search}
          />
          <VerticalSpace space="extraSmall" />
        </Container>
      </div>
      <Container space="small">
        {(search || category != "") && (
          <div>
            <Text>
              <Bold>
                Icons
                {search && ` matched "${search}"`}
                {category != "" && ` in category "${category}"`}
                {":"}
              </Bold>
            </Text>
            <VerticalSpace space="small" />
          </div>
        )}
      </Container>
      <Container space="small">
        <div class="grid">
          {results.slice(0, limit).map((icon) => (
            <IconButton
              key={icon.name}
              icon={icon}
              stroke={stroke}
              outlineStroke={outlineStroke}
            />
          ))}
        </div>
        {results.length === 0 && (
          <div>
            <VerticalSpace space="medium" />
            <Text align="center">
              <Muted>Sorry, we don't have any icon to match your query.</Muted>
            </Text>
            <VerticalSpace space="large" />
          </div>
        )}
        {results.length - limit > 0 && (
          <div>
            <VerticalSpace space="medium" />
            <Text align="center">
              <Muted>
                &hellip;and {results.length - limit} more. Use the search to
                find more icons.
              </Muted>
            </Text>
          </div>
        )}
        <VerticalSpace space="extraLarge" />
        <Text>
          <Muted>Tabler Icons v{version}</Muted>
        </Text>
        <VerticalSpace space="extraLarge" />
        <VerticalSpace space="extraLarge" />
      </Container>
      <div className="footer">
        <Divider />
        <Container space="medium">
          <VerticalSpace space="small" />
          <Columns style={{ alignItems: "center" }}>
            <Checkbox onChange={handleOutlineChange} value={outlineStroke}>
              <Text>Paste icons as outline</Text>
            </Checkbox>
            <Text align="right">
              <Link
                href="https://tabler-icons.io/?utm_source=figma-plugin"
                target="_blank"
              >
                Tabler Icons
              </Link>
            </Text>
          </Columns>
          <VerticalSpace space="small" />
        </Container>
      </div>
    </div>
  );
}

export default render(Plugin)
