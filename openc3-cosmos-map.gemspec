# encoding: ascii-8bit

# Create the overall gemspec
Gem::Specification.new do |s|
  s.name = 'openc3-cosmos-map'
  s.summary = 'Map'
  s.description = 'Map Tool to stream WMTS/TMS basemaps and overlay dynamic tracks and static icons'
  s.license = 'MIT'
  s.authors = ['Clay Kramp']
  s.email = ['clay@openc3.com']
  s.homepage = 'https://github.com/clayandgen/openc3-cosmos-map'
  s.platform = Gem::Platform::RUBY
  s.required_ruby_version = '>= 3.0'

  s.metadata = {
    "source_code_uri" => "https://github.com/clayandgen/openc3-cosmos-map",
    "openc3_minimum_cosmos_version" => "6.0.0",
    "openc3_store_access_type" => "public",
    "openc3_store_keywords" => "Map, WMTS, TMS, OpenLayers"
  }

  if ENV['VERSION']
    s.version = ENV['VERSION'].dup
  else
    time = Time.now.strftime("%Y%m%d%H%M%S")
    s.version = '0.0.0' + ".#{time}"
  end
  s.files = Dir.glob("{targets,lib,public,tools,microservices}/**/*") + %w(Rakefile README.md LICENSE.txt plugin.txt)
end
