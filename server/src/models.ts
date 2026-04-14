import mongoose, { Schema } from 'mongoose';

function addIdTransform(schema: Schema) {
  schema.set('toJSON', {
    virtuals: true,
    transform(_doc, ret) {
      const o = ret as Record<string, unknown>;
      if (o._id) o.id = String(o._id);
      delete o._id;
      delete o.__v;
      return o;
    },
  });
}

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    role: { type: String, required: true, enum: ['admin', 'engineer', 'field_officer'] },
    full_name: String,
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'users' },
);
addIdTransform(UserSchema);

const LocationSchema = new Schema(
  {
    name: { type: String, required: true },
    district: String,
    polygon_geojson: Schema.Types.Mixed,
    centroid_geojson: Schema.Types.Mixed,
    population: { type: Number, default: 0 },
    terrain_risk: { type: Number, default: 50 },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'locations' },
);
addIdTransform(LocationSchema);

const InfrastructureSchema = new Schema(
  {
    type: { type: String, required: true },
    condition_score: { type: Number, default: 50 },
    risk_score: Number,
    geojson: Schema.Types.Mixed,
    label: String,
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'infrastructure' },
);
addIdTransform(InfrastructureSchema);

const DisasterHistorySchema = new Schema(
  {
    type: { type: String, required: true },
    occurred_at: { type: Date, required: true },
    severity: { type: Number, default: 1 },
    geojson: Schema.Types.Mixed,
    description: String,
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'disasters_history' },
);
addIdTransform(DisasterHistorySchema);

const WeatherDataSchema = new Schema(
  {
    location_id: { type: Schema.Types.ObjectId, ref: 'Location' },
    ts: { type: Date, required: true },
    rainfall_mm: { type: Number, default: 0 },
    temp_c: Number,
    humidity: Number,
    wind_speed: Number,
    wind_deg: Number,
    raw: Schema.Types.Mixed,
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'weather_data' },
);
addIdTransform(WeatherDataSchema);
WeatherDataSchema.index({ ts: -1 });

const AlertSchema = new Schema(
  {
    type: { type: String, required: true },
    severity: { type: String, required: true, enum: ['info', 'warning', 'critical'] },
    message: { type: String, required: true },
    location_id: { type: Schema.Types.ObjectId, ref: 'Location' },
    geojson: Schema.Types.Mixed,
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'alerts' },
);
addIdTransform(AlertSchema);
AlertSchema.index({ created_at: -1 });

const ReportSchema = new Schema(
  {
    data: { type: Schema.Types.Mixed, default: {} },
    cost_estimate: Number,
    risk_score: Number,
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'reports' },
);
addIdTransform(ReportSchema);

const DeploymentSchema = new Schema(
  {
    team_name: { type: String, required: true },
    location_id: { type: Schema.Types.ObjectId, ref: 'Location' },
    status: { type: String, default: 'assigned' },
    notes: String,
    started_at: { type: Date, default: Date.now },
  },
  { collection: 'deployments' },
);
addIdTransform(DeploymentSchema);

const FieldReportSchema = new Schema(
  {
    image_url: String,
    geojson: Schema.Types.Mixed,
    damage_score: Number,
    retrofit_cost: Number,
    notes: String,
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'field_reports' },
);
addIdTransform(FieldReportSchema);

const GeoLayerSchema = new Schema(
  {
    name: String,
    feature_geojson: { type: Schema.Types.Mixed, required: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'geo_layers' },
);
addIdTransform(GeoLayerSchema);

const FutureHookSchema = new Schema(
  {
    hook_type: { type: String, required: true },
    config: { type: Schema.Types.Mixed, default: {} },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'future_hooks' },
);
addIdTransform(FutureHookSchema);

const RiskSnapshotSchema = new Schema(
  {
    location_id: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    score: { type: Number, required: true },
    category: { type: String, required: true, enum: ['low', 'medium', 'high'] },
    inputs: Schema.Types.Mixed,
    computed_at: { type: Date, default: Date.now },
  },
  { collection: 'risk_snapshots' },
);
addIdTransform(RiskSnapshotSchema);
RiskSnapshotSchema.index({ location_id: 1, computed_at: -1 });

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Location = mongoose.models.Location || mongoose.model('Location', LocationSchema);
export const Infrastructure = mongoose.models.Infrastructure || mongoose.model('Infrastructure', InfrastructureSchema);
export const DisasterHistory =
  mongoose.models.DisasterHistory || mongoose.model('DisasterHistory', DisasterHistorySchema);
export const WeatherData = mongoose.models.WeatherData || mongoose.model('WeatherData', WeatherDataSchema);
export const Alert = mongoose.models.Alert || mongoose.model('Alert', AlertSchema);
export const Report = mongoose.models.Report || mongoose.model('Report', ReportSchema);
export const Deployment = mongoose.models.Deployment || mongoose.model('Deployment', DeploymentSchema);
export const FieldReport = mongoose.models.FieldReport || mongoose.model('FieldReport', FieldReportSchema);
export const GeoLayer = mongoose.models.GeoLayer || mongoose.model('GeoLayer', GeoLayerSchema);
export const FutureHook = mongoose.models.FutureHook || mongoose.model('FutureHook', FutureHookSchema);
export const RiskSnapshot = mongoose.models.RiskSnapshot || mongoose.model('RiskSnapshot', RiskSnapshotSchema);
