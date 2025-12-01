Let's clean up and improve various parts of the UI.
Throughout everything, stick to [this guide](doc/how-to/design-on-frontend.md) and note that you must talk to [the backend API](doc/reference/backend-rest-api.md) for data.

## [CollectionsView](src/views/CollectionsView.vue)

- from the table rows, remove the action button column entirely
- remove the "updated" table column
- instead, make the title cell obviously clickable and let that redirect to manage collection view
- no other actions are needed on this page
- move the "New Collection" button below the table

## [CardPreview](src/components/CardPreview.vue)

- make sure to support lorem ipsum/demo values for header-right, front and back
- make sure to have a prop so that only the front is rendered and back cannot be looked at

## [CollectionEdit](src/components/CollectionEdit.vue)

- use `CardPreview` (front only, example values) to show how an example card would look, so user can see live changes to the collection settings

## [CollectionView](src/views/CollectionsView.vue)

these are going to be substantial changes. Yes, I still want to actually implement them, now. Now, I do not want to half-implement them and keep trash around for legacy reasons, this should simply BE CHANGED.

- get rid of the "Back" button
- make the view a fairly simple collector component for the following five components, which should live in `src/components` (make them, they don't exist yet)
- remove everything else from the page that isn't in these components


### `CollectionMetaData`

- Should be a two column layout:
    - in the left col, show a example `CardPreview` like in the collection modal. Clicking it opens the collection edit modal
    - the right col should be two rows
        - the first row should first be an icon-only button "edit" opening the collection edit modal, then the collection title rendered as heading
        - second row should be a <p> with the collection description

### `CollectionCollapsibleMaterials`

Here, we will later build capabilities to attach files. But not now.
For now, just show a standard daisy collapsible saying "no materials attached yet"

### `CollectionCollapsibleTools`

A similar collapsible. For now, should just contain one button "Download for Print" with an icon. This should replace the current "Export" button

### `CollectionCollapsibleFlashcards`

A similar collapsible, hosting the table with the flashcards in this collection.
- Instead of the preview button, have a mini-view of the `Preview` (front only) that opens the full preview modal when clicked. Should be thumbnail-sized.
- make the edit and delete buttons icon-only

### `CollectionCollapsibleDangerZone`

similar collapsible, only one that is collapsed by default. For now, should only contain the "Delete" button.