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
} from "@create-figma-plugin/ui";
import {
	emit,
} from '@create-figma-plugin/utilities'

import { h, JSX } from 'preact'
import { useState } from 'preact/hooks'
import { version, icons } from './icons.json'
import useSearch from './use-search'

type Icon = {
	name: string,
	svg: string,
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
  const svg = icon.svg.replace('stroke-width="2"', `stroke-width="${stroke}"`);

  const handleClick = (name: string, svg: string) => {
    emit("SUBMIT", {
      name,
      svg,
      outlineStroke,
    });
  };

  return (
    <button
      key={icon.name}
      aria-label={icon.name}
      onClick={() => handleClick(icon.name, svg)}
      class="icon-button"
      dangerouslySetInnerHTML={{ __html: svg }}
    ></button>
  );
}

function Plugin() {
	const [search, setSearch] = useState<string>('')
	const [category, setCategory] = useState<string>('')
	const [stroke, setStroke] = useState<string>('2')
	const [outlineStroke, setOutlineStroke] = useState<boolean>(false);

	const results = useSearch(search, category)
	const limit = 102

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

	let c: string[] = []
	icons.forEach((i) => {
		if(i.category != '' && c.indexOf(i.category) === -1) {
			c.push(i.category)
		}
	})

	c.sort()

	const categories: Array<DropdownOption> = [
		{ value: '', text: 'All categories' },
	]

	c.forEach((i) => {
		categories.push({
			value: i,
			text: i
		})
	})

	const strokes: Array<DropdownOption> = [
		{ value: '1', text: 'Thin' },
		{ value: '1.5', text: 'Light' },
		{ value: '2', text: 'Normal' },
	]

	return (
    <div>
      <div class="search">
        <SearchTextbox
          onInput={handleInput}
          placeholder={`Search ${icons.length} icons`}
          value={search}
        />
        <Divider />
        <Container space="extraSmall">
          <VerticalSpace space="extraSmall" />
          <Columns space="small">
            <Dropdown
              onChange={handleCategoryChange}
              options={categories}
              value={category}
            />
            <Dropdown
              onChange={handleStrokeChange}
              options={strokes}
              value={stroke}
            />
          </Columns>
          <VerticalSpace space="extraSmall" />
        </Container>
        <Divider />
      </div>
      <Container space="small">
        <VerticalSpace space="small" />
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
