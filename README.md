# Show More

A small WordPress plugin that shows the first blocks in a group and reveals more a few at a time.

Author: [nikodemjankiewicz](https://github.com/nikodemjankiewicz)

## Features

- Show a configurable number of direct sibling blocks initially and per click.
- Use an editable native Paragraph or Button block as the control.
- Optionally show the number of remaining visible blocks and set a final label.
- Recalculate when filters change the DOM or common visibility attributes and styles.
- Keep nested blocks within their parent block; each direct sibling counts as one item.

## Plugin Identifiers

| Item | Value |
| --- | --- |
| Plugin name | `Show More` |
| Plugin slug | `wpfse-show-more` |
| Block name | `wpfse/show-more` |
| Main plugin file | `show-more.php` |
| Text domain | `wpfse-show-more` |

## Installation

1. Copy the plugin folder to `wp-content/plugins/wpfse-show-more`.
2. Activate **Show More** in the WordPress admin.
3. Add the **Show More** block at the start of a Group, before the blocks it should control.
4. Choose a Paragraph or Button control and configure it in the block settings.

The plugin requires WordPress 6.9 or later. It has no build step or external frontend dependencies.
