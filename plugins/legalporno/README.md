## legalporno 0.1.0

by boi123212321

Extract Legalporno shoot IDs (e.g. GIO482) from video names

### Arguments

| Name    | Type    | Required | Description                                 |
| ------- | ------- | -------- | ------------------------------------------- |
| deep    | Boolean | false    | Fetch scene details                         |
| dry     | Boolean | false    | Whether to commit data changes              |
| setName | Boolean | false    | Whether to set scene name to found shoot ID |

### Example installation with default arguments

`config.json`
```json
---
{
  "plugins": {
    "register": {
      "legalporno": {
        "path": "./plugins/legalporno/main.ts",
        "args": {
          "deep": true,
          "dry": false,
          "setName": false
        }
      }
    },
    "events": {
      "sceneCreated": [
        "legalporno"
      ],
      "sceneCustom": [
        "legalporno"
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
    legalporno:
      path: ./plugins/legalporno/main.ts
      args:
        deep: true
        dry: false
        setName: false
  events:
    sceneCreated:
      - legalporno
    sceneCustom:
      - legalporno

---
```
