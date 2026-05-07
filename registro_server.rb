# frozen_string_literal: true

require "json"
require "sinatra"

set :bind, "0.0.0.0"
set :port, ENV.fetch("PORT", 4567).to_i

REGISTROS = {}

helpers do
  def json_response(obj, status = 200)
    content_type "application/json; charset=utf-8"
    status status
    JSON.generate(obj)
  end

  def parse_json_body
    request.body.rewind if request.body.respond_to?(:rewind)
    body = request.body.read.to_s
    return {} if body.strip.empty?

    JSON.parse(body)
  rescue JSON::ParserError
    :invalid
  end
end

# GET /registro/:id — devuelve el JSON almacenado para ese id
get "/registro/:id" do
  id = params[:id]
  unless REGISTROS.key?(id)
    return json_response({ "error" => "no_encontrado", "id" => id }, 404)
  end

  json_response(REGISTROS[id])
end

# POST /registro/:id — reemplaza el valor guardado por el cuerpo JSON (cualquier estructura)
post "/registro/:id" do
  id = params[:id]
  parsed = parse_json_body
  if parsed == :invalid
    return json_response({ "error" => "json_invalido" }, 400)
  end

  REGISTROS[id] = parsed
  json_response(parsed, 200)
end
