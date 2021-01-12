## freeones 0.9.0

by boi123212321, john4valor, pizzajohnny, leadwolf

Scrape data from freeones.com. Custom fields can only be named as follows (not case sensitive): Hair Color, Eye Color, Ethnicity, Height, Weight, Birthplace, Zodiac, Measurements, Chest Size, Waist Size, Hip Size, Cup Size, Bra Size, Bust Size

### Arguments

| Name                 | Type               | Required | Description                                                                                                                                                                                                                        |
| -------------------- | ------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dry                  | Boolean            | false    | Whether to commit data changes                                                                                                                                                                                                     |
| whitelist            | String[]           | false    | Array of data fields to pick (possible values: 'nationality', 'zodiac', 'aliases', 'height', 'weight', 'avatar', 'bornOn', 'labels', 'hair color', 'eye color', 'ethnicity', 'birthplace', 'measurements', 'tattoos', 'piercings') |
| blacklist            | String[]           | false    | Array of data fields to omit (for values see whitelist)                                                                                                                                                                            |
| useImperial          | Boolean            | false    | Use imperial units for height and weight                                                                                                                                                                                           |
| searchResultsSort          | String            | false    | Specify the search result sort order to use. Advanced setting: use only if you knwo what you are doing. Possible values are 'relevance', 'rank.currentRank', 'followerCount', 'profileCompleted' or 'views'. Defaults to 'relevance'.             |
| useAvatarAsThumbnail | Boolean            | false    | Use the discovered Actor Avatar as the Actor Thumbnail image                                                                                                                                                                       |
| piercingsType        | 'string' | 'array' | false    | How to return the piercings. Use 'array' if your custom field is a select or multi select                                                                                                                                          |
| tattoosType          | 'string' | 'array' | false    | How to return the tattoos. Use 'array' if your custom field is a select or multi select                                                                                                                                            |

### Example installation with default arguments

`config.json`
```json
---
{
  "plugins": {
    "register": {
      "freeones": {
        "path": "./plugins/freeones/main.ts",
        "args": {
          "dry": false,
          "whitelist": [],
          "blacklist": [],
          "useImperial": false,
          "searchResultsSort": "string",
          "useAvatarAsThumbnail": false,
          "piercingsType": "string",
          "tattoosType": "string"
        }
      }
    },
    "events": {
      "actorCreated": [
        "freeones"
      ],
      "actorCustom": [
        "freeones"
      ]
    }
  }
}
---
```

`config.yaml`
```yaml
---
plugins:
  register:
    freeones:
      path: ./plugins/freeones/main.ts
      args:
        dry: false
        whitelist: []
        blacklist: []
        useImperial: false
        searchResultsSort: string
        useAvatarAsThumbnail: false
        piercingsType: string
        tattoosType: string
  events:
    actorCreated:
      - freeones
    actorCustom:
      - freeones

---
```
