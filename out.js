module.exports = {
  "rid": "gossip",
  "meta": {
    "use": [
      {
        "kind": "module",
        "rid": "io.picolabs.subscription",
        "alias": "Subscriptions"
      },
      {
        "kind": "module",
        "rid": "io.picolabs.wrangler",
        "alias": "wrangler"
      },
      {
        "kind": "module",
        "rid": "temperature_store",
        "alias": "temperature_store"
      }
    ]
  },
  "global": async function (ctx) {
    ctx.scope.set("__testing", {
      "queries": [],
      "events": [{
          "domain": "gossip",
          "type": "subscription_wanted",
          "attrs": [
            "gossip_id",
            "eci"
          ]
        }]
    });
    ctx.scope.set("interval", 5);
    ctx.scope.set("prev_length", 0);
    ctx.scope.set("getMessageID", ctx.mkFunction([], async function (ctx, args) {
      return await ctx.applyFn(ctx.scope.get("+"), ctx, [
        await ctx.applyFn(ctx.scope.get("+"), ctx, [
          await ctx.modules.get(ctx, "meta", "picoId"),
          ":"
        ]),
        await ctx.applyFn(ctx.scope.get("defaultsTo"), ctx, [
          await ctx.modules.get(ctx, "ent", "sequenceVariable"),
          0
        ])
      ]);
    }));
    ctx.scope.set("hasNewRumor", ctx.mkFunction([], async function (ctx, args) {
      ctx.scope.set("temps", await ctx.applyFn(ctx.scope.get("temperatures"), ctx, [ctx.scope.get("temperature_store")]));
      return await ctx.applyFn(ctx.scope.get(">"), ctx, [
        await ctx.applyFn(ctx.scope.get("length"), ctx, [ctx.scope.get("temps")]),
        ctx.scope.get("prev_length")
      ]);
    }));
    ctx.scope.set("createRumorMessage", ctx.mkFunction([], async function (ctx, args) {
      ctx.scope.set("temps", await ctx.applyFn(ctx.scope.get("temperatures"), ctx, [ctx.scope.get("temperature_store")]));
      ctx.scope.set("latest_temp", await ctx.applyFn(ctx.scope.get("get"), ctx, [
        ctx.scope.get("temps"),
        [await ctx.applyFn(ctx.scope.get("-"), ctx, [
            await ctx.applyFn(ctx.scope.get("length"), ctx, [ctx.scope.get("temps")]),
            1
          ])]
      ]));
      ctx.scope.set("act_temp", await ctx.applyFn(ctx.scope.get("get"), ctx, [
        ctx.scope.get("latest_temp"),
        "temperature"
      ]));
      ctx.scope.set("time", await ctx.applyFn(ctx.scope.get("get"), ctx, [
        ctx.scope.get("latest_temp"),
        "timestamp"
      ]));
      return {
        "MessageID": await ctx.applyFn(ctx.scope.get("getMessageID"), ctx, []),
        "SensorID": await ctx.modules.get(ctx, "meta", "picoId"),
        "Temperature": ctx.scope.get("act_temp"),
        "Timestamp": ctx.scope.get("time")
      };
    }));
    ctx.scope.set("createSeenMessage", ctx.mkFunction([], async function (ctx, args) {
      return await ctx.applyFn(ctx.scope.get("map"), ctx, [
        await ctx.modules.get(ctx, "ent", "rumors"),
        ctx.mkFunction([
          "num_map",
          "picoID"
        ], async function (ctx, args) {
          ctx.scope.set("num_map", args["num_map"]);
          ctx.scope.set("picoID", args["picoID"]);
          ctx.scope.set("sorted_nums", await ctx.applyFn(ctx.scope.get("sort"), ctx, [
            await ctx.applyFn(ctx.scope.get("keys"), ctx, [ctx.scope.get("num_map")]),
            ctx.mkFunction([
              "a",
              "b"
            ], async function (ctx, args) {
              ctx.scope.set("a", args["a"]);
              ctx.scope.set("b", args["b"]);
              return await ctx.applyFn(ctx.scope.get("<"), ctx, [
                ctx.scope.get("a"),
                ctx.scope.get("b")
              ]) ? await ctx.applyFn(ctx.scope.get("-"), ctx, [1]) : await ctx.applyFn(ctx.scope.get("=="), ctx, [
                ctx.scope.get("a"),
                ctx.scope.get("b")
              ]) ? 0 : 1;
            })
          ]));
          return await ctx.applyFn(ctx.scope.get("get"), ctx, [
            await ctx.applyFn(ctx.scope.get("filter"), ctx, [
              ctx.scope.get("sorted_nums"),
              ctx.mkFunction(["x"], async function (ctx, args) {
                ctx.scope.set("x", args["x"]);
                return await ctx.applyFn(ctx.scope.get("=="), ctx, [
                  ctx.scope.get("x"),
                  await ctx.applyFn(ctx.scope.get("index"), ctx, [
                    ctx.scope.get("sorted_nums"),
                    ctx.scope.get("x")
                  ])
                ]);
              })
            ]),
            [await ctx.applyFn(ctx.scope.get("-"), ctx, [
                await ctx.applyFn(ctx.scope.get("length"), ctx, [ctx.scope.get("sorted_nums")]),
                1
              ])]
          ]);
        })
      ]);
    }));
    ctx.scope.set("getPeer", ctx.mkFunction([], async function (ctx, args) {
      ctx.scope.set("peers", await ctx.applyFn(ctx.scope.get("defaultsTo"), ctx, [
        await ctx.modules.get(ctx, "ent", "peers"),
        {}
      ]));
      ctx.scope.set("my_rumors", await ctx.applyFn(ctx.scope.get("defaultsTo"), ctx, [
        await ctx.modules.get(ctx, "ent", "rumors"),
        {}
      ]));
      ctx.scope.set("greater_count", await ctx.applyFn(ctx.scope.get("filter"), ctx, [
        ctx.scope.get("peers"),
        ctx.mkFunction([
          "messageIDs",
          "peerID"
        ], async function (ctx, args) {
          ctx.scope.set("messageIDs", args["messageIDs"]);
          ctx.scope.set("peerID", args["peerID"]);
          return await ctx.applyFn(ctx.scope.get(">"), ctx, [
            await ctx.applyFn(ctx.scope.get("length"), ctx, [await ctx.applyFn(ctx.scope.get("filter"), ctx, [
                ctx.scope.get("messageIDs"),
                ctx.mkFunction([
                  "highest_seen",
                  "messageID"
                ], async function (ctx, args) {
                  ctx.scope.set("highest_seen", args["highest_seen"]);
                  ctx.scope.set("messageID", args["messageID"]);
                  return await ctx.applyFn(ctx.scope.get("<"), ctx, [
                    ctx.scope.get("highest_seen"),
                    await ctx.applyFn(ctx.scope.get("get"), ctx, [
                      ctx.scope.get("my_rumors"),
                      ctx.scope.get("messageID")
                    ])
                  ]);
                })
              ])]),
            0
          ]);
        })
      ]));
      return await ctx.applyFn(ctx.scope.get(">"), ctx, [
        await ctx.applyFn(ctx.scope.get("length"), ctx, [ctx.scope.get("greater_count")]),
        0
      ]) ? await ctx.applyFn(ctx.scope.get("get"), ctx, [
        await ctx.applyFn(ctx.scope.get("keys"), ctx, [ctx.scope.get("greater_count")]),
        [0]
      ]) : await ctx.applyFn(ctx.scope.get("get"), ctx, [
        await ctx.applyFn(ctx.scope.get("keys"), ctx, [ctx.scope.get("peers")]),
        [0]
      ]);
    }));
    ctx.scope.set("prepareMessage", ctx.mkFunction(["subscriber"], async function (ctx, args) {
      ctx.scope.set("subscriber", args["subscriber"]);
      ctx.scope.set("type", await ctx.applyFn(await ctx.modules.get(ctx, "random", "integer"), ctx, [1]));
      ctx.scope.set("type", await ctx.applyFn(ctx.scope.get("hasNewRumor"), ctx, []) ? await ctx.applyFn(await ctx.modules.get(ctx, "random", "integer"), ctx, [1]) : 1);
      ctx.scope.set("type", await ctx.applyFn(ctx.scope.get("=="), ctx, [
        ctx.scope.get("type"),
        1
      ]) ? true : false);
      return ctx.scope.get("type") ? [
        {
          "eci": ctx.scope.get("subscriber"),
          "eid": "heartbeat-seen",
          "domain": "gossip",
          "type": "seen",
          "attrs": { "seen": await ctx.applyFn(ctx.scope.get("createSeenMessage"), ctx, []) }
        },
        ctx.scope.get("type")
      ] : [
        {
          "eci": ctx.scope.get("subscriber"),
          "eid": "heartbeat-rumor",
          "domain": "gossip",
          "type": "rumor",
          "attrs": { "rumor": await ctx.applyFn(ctx.scope.get("createRumorMessage"), ctx, []) }
        },
        ctx.scope.get("type")
      ];
    }));
    ctx.scope.set("update", ctx.mkFunction([
      "subscriber",
      "messageID"
    ], async function (ctx, args) {
      ctx.scope.set("subscriber", args["subscriber"]);
      ctx.scope.set("messageID", args["messageID"]);
      return "ent:peers.put([subscriber, ])";
    }));
    ctx.scope.set("setInterval", ctx.mkFunction(["n"], async function (ctx, args) {
      ctx.scope.set("n", args["n"]);
      ctx.scope.set("interval", ctx.scope.get("n"));
      return ctx.scope.get("interval");
    }));
  },
  "rules": {
    "seen_gossip": {
      "name": "seen_gossip",
      "select": {
        "graph": { "gossip": { "seen": { "expr_0": true } } },
        "state_machine": {
          "start": [[
              "expr_0",
              "end"
            ]]
        }
      },
      "body": async function (ctx, runAction, toPairs) {
        ctx.scope.set("my_rumors", await ctx.applyFn(ctx.scope.get("defaultsTo"), ctx, [
          await ctx.modules.get(ctx, "ent", "rumors"),
          {}
        ]));
        ctx.scope.set("seen_rumors", await ctx.applyFn(await ctx.modules.get(ctx, "event", "attr"), ctx, ["seen"]));
        ctx.scope.set("subscriptionID", await ctx.applyFn(await ctx.modules.get(ctx, "event", "attr"), ctx, ["eci"]));
        ctx.scope.set("peers", await ctx.applyFn(ctx.scope.get("set"), ctx, [
          ctx.scope.get("peers"),
          [ctx.scope.get("subscriptionID")],
          ctx.scope.get("seen_rumors")
        ]));
        ctx.scope.set("diff", await ctx.applyFn(ctx.scope.get("values"), ctx, [await ctx.applyFn(ctx.scope.get("map"), ctx, [
            ctx.scope.get("my_rumors"),
            ctx.mkFunction([
              "num_map",
              "picoID"
            ], async function (ctx, args) {
              ctx.scope.set("num_map", args["num_map"]);
              ctx.scope.set("picoID", args["picoID"]);
              return await ctx.applyFn(ctx.scope.get("filter"), ctx, [
                ctx.scope.get("num_map"),
                ctx.mkFunction([
                  "rumor",
                  "num"
                ], async function (ctx, args) {
                  ctx.scope.set("rumor", args["rumor"]);
                  ctx.scope.set("num", args["num"]);
                  return await ctx.applyFn(ctx.scope.get(">"), ctx, [
                    ctx.scope.get("num"),
                    await ctx.applyFn(ctx.scope.get("get"), ctx, [
                      ctx.scope.get("seen_rumors"),
                      ctx.scope.get("picoID")
                    ])
                  ]);
                })
              ]);
            })
          ])]));
        var fired = await ctx.applyFn(ctx.scope.get(">"), ctx, [
          await ctx.applyFn(ctx.scope.get("length"), ctx, [ctx.scope.get("diff")]),
          0
        ]);
        if (fired) {
          await runAction(ctx, void 0, "noop", [], []);
        }
        if (fired)
          ctx.emit("debug", "fired");
        else
          ctx.emit("debug", "not fired");
        if (fired) {
          await ctx.raiseEvent({
            "domain": "gossip",
            "type": "send_diff",
            "attributes": {
              "diff": ctx.scope.get("diff"),
              "return_eci": await ctx.modules.get(ctx, "event", "eci")
            },
            "for_rid": undefined
          });
        }
      }
    },
    "send_diff_gossip": {
      "name": "send_diff_gossip",
      "select": {
        "graph": { "gossip": { "send_diff": { "expr_0": true } } },
        "state_machine": {
          "start": [[
              "expr_0",
              "end"
            ]]
        }
      },
      "body": async function (ctx, runAction, toPairs) {
        var foreach0_pairs = toPairs(await ctx.applyFn(await ctx.modules.get(ctx, "event", "attr"), ctx, ["diff"]));
        var foreach0_len = foreach0_pairs.length;
        var foreach0_i;
        for (foreach0_i = 0; foreach0_i < foreach0_len; foreach0_i++) {
          var foreach_is_final = foreach0_i === foreach0_len - 1;
          ctx.scope.set("d", foreach0_pairs[foreach0_i][1]);
          var fired = true;
          if (fired) {
            await runAction(ctx, "event", "send", [{
                "eci": await ctx.applyFn(await ctx.modules.get(ctx, "event", "attr"), ctx, ["return_eci"]),
                "eid": "diff-rumor",
                "domain": "gossip",
                "type": "rumor",
                "attrs": { "rumor": ctx.scope.get("d") }
              }], []);
          }
          if (fired)
            ctx.emit("debug", "fired");
          else
            ctx.emit("debug", "not fired");
        }
      }
    },
    "rumor_gossip": {
      "name": "rumor_gossip",
      "select": {
        "graph": { "gossip": { "rumor": { "expr_0": true } } },
        "state_machine": {
          "start": [[
              "expr_0",
              "end"
            ]]
        }
      },
      "body": async function (ctx, runAction, toPairs) {
        ctx.scope.set("new_rumor", await ctx.applyFn(await ctx.modules.get(ctx, "event", "attr"), ctx, ["rumor"]));
        ctx.scope.set("messageID", await ctx.applyFn(ctx.scope.get("get"), ctx, [
          ctx.scope.get("new_rumor"),
          ctx.scope.get("messageID")
        ]));
        ctx.scope.set("picoID", await ctx.applyFn(ctx.scope.get("get"), ctx, [
          await ctx.applyFn(ctx.scope.get("split"), ctx, [
            ctx.scope.get("messageID"),
            new RegExp(":", "")
          ]),
          [0]
        ]));
        ctx.scope.set("num", await ctx.applyFn(ctx.scope.get("get"), ctx, [
          await ctx.applyFn(ctx.scope.get("split"), ctx, [
            ctx.scope.get("messageID"),
            new RegExp(":", "")
          ]),
          [1]
        ]));
        var fired = true;
        if (fired)
          ctx.emit("debug", "fired");
        else
          ctx.emit("debug", "not fired");
        if (fired) {
          await ctx.modules.set(ctx, "ent", "rumors", await ctx.applyFn(ctx.scope.get("set"), ctx, [
            await ctx.modules.get(ctx, "ent", "rumors"),
            [
              ctx.scope.get("picoID"),
              ctx.scope.get("num")
            ],
            ctx.scope.get("new_rumor")
          ]));
        }
      }
    },
    "gossip": {
      "name": "gossip",
      "select": {
        "graph": { "gossip": { "heartbeat": { "expr_0": true } } },
        "state_machine": {
          "start": [[
              "expr_0",
              "end"
            ]]
        }
      },
      "body": async function (ctx, runAction, toPairs) {
        ctx.scope.set("subscriber", await ctx.applyFn(ctx.scope.get("getPeer"), ctx, []));
        ctx.scope.set("m_and_type", await ctx.applyFn(ctx.scope.get("prepareMessage"), ctx, [ctx.scope.get("subscriber")]));
        ctx.scope.set("m", await ctx.applyFn(ctx.scope.get("get"), ctx, [
          ctx.scope.get("m_and_type"),
          [0]
        ]));
        ctx.scope.set("type", await ctx.applyFn(ctx.scope.get("get"), ctx, [
          ctx.scope.get("m_and_type"),
          [1]
        ]));
        var fired = true;
        if (fired) {
          await runAction(ctx, "event", "send", [ctx.scope.get("m")], []);
        }
        if (fired)
          ctx.emit("debug", "fired");
        else
          ctx.emit("debug", "not fired");
        if (fired) {
          ctx.scope.set("messageID", await ctx.applyFn(ctx.scope.get("get"), ctx, [
            await ctx.applyFn(ctx.scope.get("get"), ctx, [
              await ctx.applyFn(ctx.scope.get("get"), ctx, [
                ctx.scope.get("m"),
                "attrs"
              ]),
              "rumor"
            ]),
            "MessageID"
          ]));
          ctx.scope.set("picoID", await ctx.applyFn(ctx.scope.get("get"), ctx, [
            await ctx.applyFn(ctx.scope.get("split"), ctx, [
              ctx.scope.get("messageID"),
              new RegExp(":", "")
            ]),
            [0]
          ]));
          ctx.scope.set("num", await ctx.applyFn(ctx.scope.get("get"), ctx, [
            await ctx.applyFn(ctx.scope.get("split"), ctx, [
              ctx.scope.get("messageID"),
              new RegExp(":", "")
            ]),
            [1]
          ]));
          ctx.scope.set("rumor", await ctx.applyFn(ctx.scope.get("get"), ctx, [
            await ctx.applyFn(ctx.scope.get("get"), ctx, [
              ctx.scope.get("m"),
              "attrs"
            ]),
            "rumor"
          ]));
          await ctx.modules.set(ctx, "ent", "rumors", ctx.scope.get("type") ? await ctx.modules.get(ctx, "ent", "rumors") : await ctx.applyFn(ctx.scope.get("set"), ctx, [
            await ctx.modules.get(ctx, "ent", "rumors"),
            [
              ctx.scope.get("picoID"),
              ctx.scope.get("num")
            ],
            ctx.scope.get("rumor")
          ]));
          await ctx.modules.set(ctx, "ent", "sequenceVariable", ctx.scope.get("type") ? await ctx.modules.get(ctx, "ent", "sequenceVariable") : await ctx.applyFn(ctx.scope.get("+"), ctx, [
            await ctx.modules.get(ctx, "ent", "sequenceVariable"),
            1
          ]));
          await ctx.scheduleEvent({
            "attributes": undefined,
            "domain": "gossip",
            "type": "heartbeat",
            "at": await ctx.applyFn(await ctx.modules.get(ctx, "time", "add"), ctx, [
              await ctx.applyFn(await ctx.modules.get(ctx, "time", "now"), ctx, []),
              { "seconds": ctx.scope.get("interval") }
            ])
          });
        }
      }
    },
    "add_gossip_subscription": {
      "name": "add_gossip_subscription",
      "select": {
        "graph": { "gossip": { "subscription_wanted": { "expr_0": true } } },
        "state_machine": {
          "start": [[
              "expr_0",
              "end"
            ]]
        }
      },
      "body": async function (ctx, runAction, toPairs) {
        var fired = true;
        if (fired)
          ctx.emit("debug", "fired");
        else
          ctx.emit("debug", "not fired");
        await ctx.raiseEvent({
          "domain": "wrangler",
          "type": "subscription",
          "attributes": {
            "name": "gossipers",
            "wellKnown_Tx": await ctx.applyFn(await ctx.modules.get(ctx, "event", "attr"), ctx, ["eci"]),
            "Rx_role": "node",
            "Tx_role": "node"
          },
          "for_rid": undefined
        });
        await ctx.modules.set(ctx, "ent", "peers", await ctx.applyFn(ctx.scope.get("set"), ctx, [
          await ctx.modules.get(ctx, "ent", "peers"),
          [await ctx.applyFn(await ctx.modules.get(ctx, "event", "attr"), ctx, ["eci"])],
          {}
        ]));
      }
    },
    "start_gossip": {
      "name": "start_gossip",
      "select": {
        "graph": {
          "wrangler": {
            "ruleset_added": {
              "expr_0": async function (ctx, aggregateEvent, getAttrString, setting) {
                var event_attrs = await ctx.modules.get(ctx, "event", "attrs");
                Object.keys(event_attrs).forEach(function (attr) {
                  if (!ctx.scope.has(attr))
                    ctx.scope.set(attr, event_attrs[attr]);
                });
                if (!await ctx.applyFn(ctx.scope.get("><"), ctx, [
                    ctx.scope.get("rids"),
                    await ctx.applyFn(ctx.scope.get("klog"), ctx, [
                      await ctx.modules.get(ctx, "meta", "rid"),
                      "meta rid"
                    ])
                  ]))
                  return false;
                return true;
              }
            }
          }
        },
        "state_machine": {
          "start": [[
              "expr_0",
              "end"
            ]]
        }
      },
      "body": async function (ctx, runAction, toPairs) {
        var fired = true;
        if (fired)
          ctx.emit("debug", "fired");
        else
          ctx.emit("debug", "not fired");
        await ctx.scheduleEvent({
          "attributes": undefined,
          "domain": "gossip",
          "type": "heartbeat",
          "at": await ctx.applyFn(await ctx.modules.get(ctx, "time", "add"), ctx, [
            await ctx.applyFn(await ctx.modules.get(ctx, "time", "now"), ctx, []),
            { "seconds": ctx.scope.get("interval") }
          ])
        });
      }
    }
  }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsInNvdXJjZXNDb250ZW50IjpbXX0=
