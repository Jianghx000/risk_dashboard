window.dashboardMockAdapter = {
  buildMetricValues(seed, count, modifier) {
    return Array.from({ length: count }, (_, index) => {
      const wave = Math.sin((index + seed + modifier / 11) / 1.7);
      const drift = (modifier + seed * 7 + index * 9) % 26;
      return Number((20 + (wave + 1) * 0.5 * 68 + drift).toFixed(1));
    });
  },

  buildBarValues(seed, count, modifier) {
    return Array.from({ length: count }, (_, index) => 36 + ((seed * 11 + modifier + index * 17) % 120));
  },

  buildTableRow(label, seed, index, modifier) {
    return {
      name: label,
      value1: `${((seed * 13 + modifier + index * 7) % 320) + 60}`,
      value2: `${(((seed * 9 + modifier + index * 11) % 100) / 10).toFixed(1)}%`,
      flag: (index + modifier) % 2 === 0 ? "关注" : "稳定",
    };
  },
};
