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
  SegmentedControl,
  SegmentedControlOption,
} from "@create-figma-plugin/ui";
import {
	emit,
} from '@create-figma-plugin/utilities'

import { h, JSX } from 'preact'
import { useState } from 'preact/hooks'
import { version, icons } from './icons.json'
import useSearch, { filledIcons } from './use-search'
import { IconStyle, buildFilledSvg, buildOutlineSvg } from './svg'

type Icon = {
	name: string,
	body: string,
	filled?: string,
	category: string,
	tags: string[]
}

function IconButton({
  icon,
  style,
  stroke,
  outlineStroke,
}: {
  icon: Icon;
  style: IconStyle;
  stroke: string;
  outlineStroke: boolean;
}) {
  const isFilled = style === "filled" && icon.filled !== undefined;
  const svg = isFilled
    ? buildFilledSvg(icon.filled as string)
    : buildOutlineSvg(icon.body, stroke);
  const name = isFilled ? `${icon.name}-filled` : icon.name;

  const handleClick = () => {
    emit("SUBMIT", {
      name,
      svg,
      // Filled icons have no strokes to outline.
      outlineStroke: outlineStroke && !isFilled,
    });
  };

  return (
    <button
      aria-label={name}
      title={name}
      onClick={handleClick}
      class="icon-button"
      dangerouslySetInnerHTML={{ __html: svg }}
    ></button>
  );
}

function categoryOptions(list: Array<Icon>): Array<DropdownOption> {
	return [
		{ value: '', text: 'All categories' },
		...Array.from(new Set(list.map((icon) => icon.category)))
			.filter((category) => category !== '')
			.sort()
			.map((category) => ({ value: category, text: category })),
	]
}

const iconsByStyle: Record<IconStyle, Array<Icon>> = {
	outline: icons,
	filled: filledIcons,
}

// Some categories have no filled icons, so each style gets its own list.
const categoriesByStyle: Record<IconStyle, Array<DropdownOption>> = {
	outline: categoryOptions(icons),
	filled: categoryOptions(filledIcons),
}

const styles: Array<SegmentedControlOption> = [
	{ value: 'outline', children: 'Outline' },
	{ value: 'filled', children: 'Filled' },
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
	const [style, setStyle] = useState<IconStyle>('outline')

	const results = useSearch(search, category, style)
	const categories = categoriesByStyle[style]

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

	function handleStyleChange(value: string) {
		const nextStyle = value as IconStyle
		setStyle(nextStyle)

		// Reset the category if the new style has no icons in it.
		if (category !== '' && !iconsByStyle[nextStyle].some((icon) => icon.category === category)) {
			setCategory('')
		}
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
              disabled={style === "filled"}
            />
          </Columns>
        </Container>
        <VerticalSpace space="extraSmall" />
        <Container space="extraSmall">
          <div class="search-row">
            <div class="search-row-textbox">
              <SearchTextbox
                onInput={handleInput}
                placeholder={`Search ${iconsByStyle[style].length} icons`}
                value={search}
              />
            </div>
            <SegmentedControl
              onValueChange={handleStyleChange}
              options={styles}
              value={style}
            />
          </div>
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
              style={style}
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
            <Checkbox
              onChange={handleOutlineChange}
              value={outlineStroke}
              disabled={style === "filled"}
            >
              <Text>Paste icons as outline</Text>
            </Checkbox>
            <Text align="right">
              <Link
                href="https://tabler.io/icons?utm_source=figma-plugin"
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
