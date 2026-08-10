type HuntConfigProps = {
  config: Record<string, string>;
  onChange: (key: string, value: string) => void;
};

/** Optional Alpha Hunt tuning — POA_API_URL stays hardcoded at deploy. */
export function PoAHuntSkillConfig({ config, onChange }: HuntConfigProps) {
  return (
    <div className="ga-widget-config-fields ga-widget-config-grid">
      <p className="ga-widget-muted ga-widget-config-grid-span2" style={{ margin: '0 0 4px' }}>
        Optional — improves tx discovery and pick quality
      </p>
      <label className="ga-widget-field">
        <span>Forensic previews</span>
        <input
          className="ga-widget-input ga-widget-input-compact"
          type="number"
          min={0}
          max={10}
          value={config.FORENSIC_PREVIEW_COUNT ?? '3'}
          onChange={(e) => onChange('FORENSIC_PREVIEW_COUNT', e.target.value)}
        />
      </label>
      <label className="ga-widget-field">
        <span>Tx scan limit</span>
        <input
          className="ga-widget-input ga-widget-input-compact"
          type="number"
          min={5}
          max={100}
          value={config.ETHERSCAN_TX_LIMIT ?? '40'}
          onChange={(e) => onChange('ETHERSCAN_TX_LIMIT', e.target.value)}
        />
      </label>
      <label className="ga-widget-field ga-widget-config-grid-span2">
        <span>Etherscan API key (optional)</span>
        <input
          className="ga-widget-input ga-widget-input-compact"
          type="password"
          value={config.ETHERSCAN_API_KEY ?? ''}
          onChange={(e) => onChange('ETHERSCAN_API_KEY', e.target.value)}
          placeholder="Improves whale tx discovery"
          autoComplete="off"
        />
      </label>
    </div>
  );
}
