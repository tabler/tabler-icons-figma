import { on, showUI } from "@create-figma-plugin/utilities";

import { InsertIconData, insertIcon } from "./insert-icon";

export default function () {
  showUI({
    width: 300,
    height: 400,
  });

  on("SUBMIT", (data: InsertIconData) => {
    const icon = insertIcon(data, figma.viewport.center);

    figma.currentPage.selection = [icon];
  });
}
