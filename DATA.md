# Data dictionary and version notes

## 600 numerical cases

File: `600组数据.xlsx` (retained unchanged).

- **原始数据** — 600 rows of original-scale model inputs and reference responses. These rows were compared with the latest corrected 600-case training data and match it. Rock class V is encoded as E = 1.0 GPa.
- **归一化数据** — retained normalised values from the supplied workbook. This sheet is not read by the application; the deployed model uses its own saved training-set scaling parameters.
- **η与损伤状态** — historical derived values supplied with the workbook. Its η column predates the current SHAP weights: 586 of 600 values differ from the current formula by more than 0.000001, with a maximum absolute difference of approximately 0.00637436. The `门控值g` and `控制截面` columns are retained as supplied and are not inputs or predicted outputs of the application.

For current analysis, use **原始数据** and compute η with the coefficients below. Do not use the historical η column as the current model output.

| Original header | Meaning | Unit |
| --- | --- | --- |
| 工况 | Case identifier | — |
| θ (°) | Angular location of the void | ° |
| ω (°) | Circumferential angular extent of the void | ° |
| d (m) | Radial void thickness | m |
| l (m) | Longitudinal void length | m |
| D | Lining deterioration degree | Dimensionless |
| H (m) | Tunnel burial depth | m |
| λ | Lateral pressure coefficient | Dimensionless |
| S | Rock mass class label | I–V |
| ζmin | Reference minimum relative safety factor | Dimensionless |
| E (GPa) | Deformation modulus encoding the rock mass class | GPa |

S identifies the class; E is its numerical encoding. They are not two separate model inputs.

## 9,400 additional scenarios

File: `预测数据_9400组_最新.xlsx` (retained unchanged).

The **预测数据** worksheet has 9,400 rows. The input variables and units are the same as above. Its additional columns are:

| Header | Meaning |
| --- | --- |
| 工况编号 | Scenario identifier, Scenario1–Scenario9400 |
| 预测 ζmin | Saved LightGBM prediction on the original response scale |
| η | Composite defect intensity calculated with the current SHAP weights |
| 归一化预测值 | Prediction on the saved training-set normalised response scale |

The output conversion is:

```text
original-scale prediction = normalised prediction × 2.084695 + 0.303993
```

## Current intensity definition

```text
z1 = ω / 50
z2 = D / 0.8
a1 = 0.17488864343200103
a2 = 0.8251113565679989
η  = a1 × z1 + a2 × z2
```

The intensity depends on ω and D. The other six inputs remain part of the safety-factor predictor. A single value of η therefore does not uniquely determine the predicted safety factor.

## Data use

The 10,000-case analysis set consists of the 600 original-scale reference rows and the 9,400 surrogate predictions. Each source has unique case identifiers. The spreadsheet files contain stored values: changing a cell does not rerun the model.

All uploaded workbook bytes are preserved. `checksums.json` allows downloaded copies to be checked against this release. `release-verification.json` records the numerical checks performed before publication.
