# Squish Club public release notice

This directory is the static Squish Club release built from the public
[SquishClub repository](https://github.com/betterpelicans-bot/SquishClub/tree/9f41b1f832a5bda67aece96ca049a794cbc9c9fb)
at commit `9f41b1f832a5bda67aece96ca049a794cbc9c9fb`.

Build command:

```text
NEXT_PUBLIC_BASE_PATH=/squishclub corepack pnpm build
```

The release boundary is the source repository's `dist/client` output. The
published entry point is `index.html`; the optional `/voxel/` prototype is also
included because it is part of that complete build output.

## Provenance

- Game source, build configuration and catalogue: [SquishClub at the pinned commit](https://github.com/betterpelicans-bot/SquishClub/tree/9f41b1f832a5bda67aece96ca049a794cbc9c9fb).
- Toy catalogue and per-toy metadata: [`art/catalog.json`](https://github.com/betterpelicans-bot/SquishClub/blob/9f41b1f832a5bda67aece96ca049a794cbc9c9fb/art/catalog.json) and the `art/approved/<slug>/asset.json` records.
- Toy artwork: original raster artwork generated through the Codex built-in `image_gen` route and prepared/validated with the repository's transparency and artwork workflow. The complete workflow and evidence remain in [`docs/ART_WORKFLOW.md`](https://github.com/betterpelicans-bot/SquishClub/blob/9f41b1f832a5bda67aece96ca049a794cbc9c9fb/docs/ART_WORKFLOW.md).
- Character, room and starter-toy atlases: original generated artwork documented in [`docs/art-prompts.json`](https://github.com/betterpelicans-bot/SquishClub/blob/9f41b1f832a5bda67aece96ca049a794cbc9c9fb/docs/art-prompts.json), [`docs/player-art.json`](https://github.com/betterpelicans-bot/SquishClub/blob/9f41b1f832a5bda67aece96ca049a794cbc9c9fb/docs/player-art.json), and [`docs/player-art-prompts.json`](https://github.com/betterpelicans-bot/SquishClub/blob/9f41b1f832a5bda67aece96ca049a794cbc9c9fb/docs/player-art-prompts.json).
- Optional voxel prototype: procedural Blender output with the source-side manifest in [`public/voxel/manifest.json`](https://github.com/betterpelicans-bot/SquishClub/blob/9f41b1f832a5bda67aece96ca049a794cbc9c9fb/public/voxel/manifest.json).
- Audio is original Web Audio synthesis. There are no third-party asset packs, advertisements, analytics, purchases, paid runtime APIs, or external runtime asset requests.
- No source archive or third-party license archive is used by this release. The source pages above are the authoritative provenance records; the checksums below pin the shipped media bytes.

## SHA-256 checksums of shipped media

### Main game artwork

```text
art/bunny.png ac6b87c963dcfa572ae4cb24d630e56d10dbb89502d6e22d42ebad65da7c25e6
art/bunny-walk-s.png 50f8ee27a4dfaf65a838f41951b0ee970eb5433533294cac335a43a320fe3243
art/bunny-walk-se.png f48d321b818e6dd193b4fc56fed78e02c5bc49aa387393d7a3877f3caa18ed90
art/bunny-walk-e.png 26da214f7c0adb71ba4c17cb1d0bd5015e8992772bebdca94ee9568a430b2821
art/bunny-walk-ne.png 7238b86303203a3b8d3590dfb680818984859719f6d70cbd9e871ae227bdbaf6
art/bunny-walk-n.png dc7831f04d27ea551a00f374b3f1812f66e88d37715877619165c15a93757b5e
art/room.png bebed68d063e3a8f835f26702f67b581115b481f877f212e2354dfc8215b4595
art/toys.png 02588da6f6ab30d572b2cb976f6ffedee498d7e98b486bb85357381d3371a162
favicon.svg f11e8a2dd270faa73b05d26afcce59c53a68a2d8803c3c1df70766732caf4633
```

### Approved toy runtime images

```text
art/toys/amber-robot/toy.png a511730b3a4c86837dcafe401f429284ec6c5c506bcdaf3a84172137c6ca656e
art/toys/blueberry-whale/toy.png 8cbca9d9ea0269641c3a7e30ac88bd83a9c4a5d5636158a0ebfd56e293931345
art/toys/carrot-cuddle/toy.png 5915e10a5e2186d7b324d52a62b401f40f1935321b891176b6159d17403e26aa
art/toys/cheddar-cloud/toy.png a8c3710b737a185bbcf71d081260740e04f1d8399b21b39e24d8fbf6743f84f8
art/toys/citrus-pop/toy.png 75d41277b39c034c97d3d0617382567e101238186a3db57cfe716ee8c1b1c1b3
art/toys/cocoa-bear/toy.png 06a29a62fcaedf25962076b4b249149d04d86f6e5ab4149db58afc356dc3c328
art/toys/copper-kettle/toy.png 9c5e738364c88ebcfdc435270c306c6db7262af23a7519e1b8b5ea241ae06b4e
art/toys/ember-fox/toy.png c3a7add13cfb60b693e02d573e601a9652dca46726633299e52a9484926fd2a0
art/toys/kiwi-turtle/toy.png 9dc8d9083766db7218e1929ccf26f56f52628dc688efb190fb1bca66cb22fdcc
art/toys/lavender-cloud/toy.png fb76a1881eb7730a4ebf135b74369901ae1b7cfc50a46bce5502ca5c66c3ba3f
art/toys/lemon-pop/toy.png 408c034b947851abb96bb51b9b96577baa92e6e4498010d85cb6c555bfef43e7
art/toys/lemon-soda/toy.png 01cb6df9d644f27e4b6efeb3ce2398e14815bd82041cd443e0c7e35b59bc5d06
art/toys/lilac-mushroom/toy.png 5725d37eaf52ff2cbf5efe5f638be7391e18a9412125db3c98b049dce5cefe09
art/toys/lime-slice/toy.png fcdd82158417a359e2df79548fcdf1306a75af8fb712e9b839dfb72827ae4
art/toys/lime-soda/toy.png 9de94fdb01d8ef3ddfd293cbcc32ef11383eecf09d8497e4fad880b67e092a0d
art/toys/mango-mallow/toy.png feec1cf38cbfa6f29b695225b631b0d029d70aebe3352f165709514c082c2f20
art/toys/marigold-lantern/toy.png 4615dc8aa935ff7eb2b4017dbd9aa603d1308c2ad98e18d8d0a52b16a3a572b1
art/toys/mint-axolotl/toy.png dbf338f5a09478bea6d28fa32034c2fd8c3bf42821805c2826dc5146a3134c93
art/toys/pearl-owl/toy.png a6d9e4d4c04f0615e1a3290657bf1f7c0abc59e6306cdefcb22653565fcc6572
art/toys/pink-sprinkle-donut/toy.png 588390495e364bbc925fd8a728208e6159a2a83ac68fc970dd9597007bb63f25
art/toys/pumpkin-puff/toy.png 6c39d359c7b9d639976987613e2c6da6e6b1e8abe28b573100fa803c6d5f263f
art/toys/rose-cupcake/toy.png bbead6a178ad05ca1c4d5302eddd0cfff5ea1a1152c0c232071121279c7a45cc
art/toys/seafoam-seal/toy.png 4bf8105168c3c9a8dae00c1152437d8555ebce7d6981e863ca56a6ade4382c5a
art/toys/strawberry-puff/toy.png 51dc1edf46b48aee4e0dd208ba4d52f07597127735dab8bd9929f718c07c106b
art/toys/sunny-satsuma/toy.png 21f54951bc4ebcc9f607ed1a20a3f6b2cc4d708d89a77d938dd95859ecfd898f
art/toys/tiger-mochi/toy.png 98f2d4d528536e2be65c71cc73324a81b9ebfbc572a4431cf5c953e5d412d7ef
art/toys/tomato-tumble/toy.png 147991ad4c360e487db22f9f274044bc96fdc142a8a78fb9e08dd12b41ae93e9
```

### Optional voxel prototype assets

```text
voxel/manifest.json ec7838aaac7b127217cbfaa82dfaef75c09a26ddb4b2982358412876b3275ade
voxel/bear.glb b683bd3fe4ca8f601d4f3061fcf4e3edf0ff280aea9f4dbcda8be096d8d8a4bb
voxel/bunny.glb 7777146e7dcabcb3c0721b61cfa2e0e6d62fc1289949c56bc09c386c4b774e1a
voxel/cake.glb b5c3d3787f2a31b220549c3c78b1345eb5dd121e1e61b079c8880c36af72b28c
voxel/duck.glb 1be9a8c47bebbeb48758ffc7cc93e1fc87acc3f5d5d761733c74137e4b747eb0
voxel/frog.glb 46763ab8a98621a1f95711cd356b05948da634e5a6d5732480216b6190019be3
voxel/heart.glb efefd263eef3c6a319375b83642550e37204c7c54d626177014f5f1c12f13025
voxel/room.glb 865f243b03c20dadc79aef2a54176d62355b40b22c5ad2802286261376011515
voxel/star.glb 67b1e1a0e8d1098ca201d5d4a4a4e36275a72571400dd357d898f43eacc80f30
voxel/surprise.glb 25f8f4831b8572f189ddd64dcc58e6e3998b009a4ec04531c5affb5cc367f2d3
voxel/train.glb 1ac372348e63875a3edd802efe103465f0124f36f3b0c6cd1f9e8e2d0ad159f8
```
