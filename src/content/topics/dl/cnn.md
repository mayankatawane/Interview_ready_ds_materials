---
title: Convolutional neural networks
short: CNNs
subject: dl
group: Architectures
order: 1
summary: Small learned filters slide over an image and reuse the same weights everywhere. Output-size and parameter formulas, pooling, receptive field, famous architectures and transfer learning.
minutes: 18
---

CNN questions often include quick calculations (output size, number of parameters) plus concepts: why convolutions instead of dense layers, pooling, receptive field, 1×1 convolutions, ResNet and transfer learning.

## 1. Why not a dense network on images?

A 224 × 224 colour image has $224 \times 224 \times 3 = 150{,}528$ numbers. A dense layer to just 1,000 units would need about **150 million** weights. It would also ignore that neighbouring pixels are related, and it would have to learn "cat ear" separately for every position in the image.

CNNs fix this with two ideas:

- **Local connectivity**: each output looks only at a small patch (e.g. 3 × 3 pixels).
- **Weight sharing**: the same small filter is used at every position. A filter that detects a vertical edge detects it anywhere. This is called **translation equivariance**: shift the image, and the feature map shifts the same way.

## 2. The convolution operation

A **filter** (or kernel) is a small grid of learned weights, e.g. 3 × 3. To apply it:

1. Place the filter over a 3 × 3 patch of the image.
2. Multiply each pixel by the matching filter weight and add everything up (plus a bias).
3. Write that one number into the output (the **feature map**).
4. Slide the filter one step (the **stride**) and repeat across the whole image.

::viz{name="conv-demo"}

### Output size

$$
\text{output size} = \Big\lfloor\frac{n + 2p - k}{s}\Big\rfloor + 1
$$

:::symbols
- $n$ = input height (or width); $k$ = filter size; $p$ = padding (pixels of zeros added around the border); $s$ = stride (step size).
- $\lfloor\cdot\rfloor$ = round down.
:::

:::worked
- 32 × 32 input, 5 × 5 filter, no padding, stride 1: $(32 - 5)/1 + 1 = 28$ → 28 × 28.
- 224 input, 3 × 3 filter, padding 1, stride 1: $(224 + 2 - 3)/1 + 1 = 224$. "Same" padding keeps the size.
- Same, but stride 2: $\lfloor 223/2\rfloor + 1 = 112$. Stride 2 halves the size.
:::

## 3. Channels and parameter count

A colour image has 3 **channels** (red, green, blue). A filter always covers **all** input channels, so a "3 × 3" filter on 64 input channels really has $3 \times 3 \times 64$ weights. A layer with $C_{out}$ filters produces $C_{out}$ output channels.

$$
\text{parameters} = k \times k \times C_{in} \times C_{out} + C_{out}
$$

:::symbols
- $C_{in}$ = input channels; $C_{out}$ = number of filters (output channels).
- The final $+ C_{out}$ is one bias per filter.
:::

:::worked
A 3 × 3 convolution from 64 to 128 channels: $3 \times 3 \times 64 \times 128 + 128 = 73{,}856$ parameters, **the same for any image size**, because the filters are shared across positions.
:::

## 4. Pooling, receptive field and depth

**Pooling** shrinks feature maps:

- **Max pooling** (2 × 2, stride 2): keep the largest value in each 2 × 2 window. Halves height and width, keeps the strongest responses, adds a little tolerance to small shifts.
- **Average pooling**: average instead of max.
- **Global average pooling**: average each whole channel down to one number at the end of the network, replacing big dense layers.

**Receptive field**: the area of the original image that affects one output value. It grows as you stack layers.

:::worked
Two stacked 3 × 3 convolutions see a 5 × 5 area; three see 7 × 7.

Three 3 × 3 layers use $3 \times 9C^2 = 27C^2$ weights (with $C$ channels in and out), while one 7 × 7 layer uses $49C^2$. Same receptive field, fewer weights, and two extra non-linearities. That's the insight behind VGG.
:::

**1 × 1 convolutions** mix information across channels at each pixel (like a small dense layer per pixel). Used to shrink or expand the number of channels cheaply (bottlenecks in ResNet and Inception).

Layers learn a **hierarchy**: early layers detect edges and colours, middle layers textures and shapes, late layers object parts and whole objects.

## 5. Training and prediction

**Training**: exactly like any network: forward pass through conv → activation → pooling blocks → a classifier head; cross-entropy loss; backprop updates the filter weights; Adam or SGD with momentum; heavy data augmentation (flips, crops, colour jitter).

**Prediction**: one forward pass; softmax over the classes.

## 6. Landmark architectures

| Model | Key idea |
|---|---|
| LeNet (1998) | Convolution + pooling + dense layers, for handwritten digits |
| AlexNet (2012) | Deep CNN on GPUs with ReLU and dropout; won ImageNet by a wide margin |
| VGG (2014) | Only 3 × 3 convolutions, very deep and uniform |
| GoogLeNet / Inception | Parallel filter sizes; 1 × 1 bottlenecks |
| ResNet (2015) | **Residual connections** $y = x + F(x)$, so 50 to 152 layers train easily |
| EfficientNet | Scale depth, width and image resolution together |
| Vision Transformer (ViT) | Cut the image into 16 × 16 patches and treat them as tokens for a Transformer |

## 7. Transfer learning for images

Most real projects start from a model pretrained on ImageNet:

| Your data | What to do |
|---|---|
| Small, similar to ImageNet | Freeze the backbone; train only a new classifier head |
| Small, different (X-rays, satellite) | Freeze early layers; fine-tune later layers with a small learning rate; strong augmentation |
| Large | Fine-tune the whole network with a small learning rate |

:::trap
**Is a CNN translation invariant?** Convolution is translation **equivariant**: shift the input, the feature map shifts the same way. Pooling and global pooling add some **invariance** (the final prediction doesn't change). Full invariance isn't guaranteed (striding and borders break it), which is why shift and crop augmentation still helps.
:::

## 8. Code

```python
import torch.nn as nn
from torchvision import models

model = models.resnet50(weights="IMAGENET1K_V2")    # pretrained backbone
for p in model.parameters():
    p.requires_grad = False                           # freeze
model.fc = nn.Linear(model.fc.in_features, 5)         # new head for 5 classes (trainable)

small_cnn = nn.Sequential(
    nn.Conv2d(3, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(), nn.MaxPool2d(2),
    nn.Conv2d(32, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(), nn.MaxPool2d(2),
    nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Linear(64, 10))
```

:::say
"A CNN learns small filters that slide over the image with shared weights, so it needs far fewer parameters than a dense layer and detects a pattern wherever it appears. Output size is n plus 2p minus k, over s, plus 1, and a conv layer has k times k times C-in times C-out plus C-out parameters. Stacking small kernels grows the receptive field cheaply, pooling downsamples, and residual connections make very deep networks trainable. In practice I fine-tune a pretrained backbone with augmentation."
:::
