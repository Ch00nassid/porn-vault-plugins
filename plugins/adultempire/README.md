## adultempire 0.3.0

by boi123212321

Scrape data from adultempire

### Arguments

| Name | Type    | Required | Description                    |
| ---- | ------- | -------- | ------------------------------ |
| dry  | Boolean | false    | Whether to commit data changes |

### Example installation with default arguments

`config.json`
```json
---
{
  "PLUGINS": {
    "adultempire": {
      "path": "./plugins/adultempire/main.js",
      "args": {
        "dry": false
      }
    }
  },
  "PLUGIN_EVENTS": {
    "movieCreated": [
      "adultempire"
    ],
    "actorCreated": [
      "adultempire"
    ]
  }
}
---
```

`config.yaml`
```yaml
---
PLUGINS:
  adultempire:
    path: ./plugins/adultempire/main.js
    args:
      dry: false
PLUGIN_EVENTS:
  movieCreated:
    - adultempire
  actorCreated:
    - adultempire

---
```
